import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  ArrowRight,
  ChevronLeft,
  Upload,
  Check,
  Copy,
  Smartphone,
  Landmark,
  Loader2,
  RefreshCw,
  User,
  Info,
  CreditCard
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import transferService from "@/services/transfer.service";
import { adminService } from "@/services/admin.service";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

// --- Types & Schemas ---

const formSchema = z.object({
  sendAmount: z.coerce.number().min(100, { message: "Minimum amount is 100" }),
  direction: z.enum(['RU_TO_RW', 'RW_TO_RU']).default('RU_TO_RW'),
  deliveryMethod: z.string().default('mobile_money'),
  recipientName: z.string().min(3, { message: "Full name is required" }),
  recipientPhone: z.string().optional(),
  recipientBank: z.string().optional(),
  recipientAccount: z.string().optional(),
  recipientNetwork: z.string().default('MTN'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const SendMoney = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState(1);
  const [exchangeRate, setExchangeRate] = useState<any>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTransfer, setCreatedTransfer] = useState<any>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  // Form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sendAmount: 10000,
      direction: 'RU_TO_RW',
      deliveryMethod: 'mobile_money',
      recipientName: '',
      recipientPhone: '',
      recipientBank: '',
      recipientAccount: '',
      recipientNetwork: 'MTN',
      notes: '',
    },
    mode: 'onChange',
  });

  const { watch, setValue, trigger, control } = form;
  const watchedAmount = watch('sendAmount');
  const watchedMethod = watch('deliveryMethod');
  const watchedDirection = watch('direction');

  const { data: cardSettings } = useQuery({
    queryKey: ['card-settings'],
    queryFn: adminService.getCardSettings,
  });

  // --- Effects ---

  // Update Exchange Rate
  useEffect(() => {
    const minAmount = watchedDirection === 'RU_TO_RW' ? 100 : 1000;
    if (watchedAmount && watchedAmount >= minAmount) {
      setIsLoadingRate(true);
      const calculateExchange = async () => {
        try {
          const from = watchedDirection === 'RU_TO_RW' ? 'RUB' : 'RWF';
          const to = watchedDirection === 'RU_TO_RW' ? 'RWF' : 'RUB';
          const rateData = await transferService.getExchangeRate(from, to, watchedAmount, watchedDirection);
          setExchangeRate(rateData);
        } catch (error) {
          console.error("Rate fetch failed", error);
          setExchangeRate(null);
        } finally {
          setIsLoadingRate(false);
        }
      };
      const timer = setTimeout(calculateExchange, 500);
      return () => clearTimeout(timer);
    } else {
      setExchangeRate(null);
    }
  }, [watchedAmount, watchedDirection]);

  // --- Handlers ---

  const handleNext = async () => {
    if (step === 1) { // Direction step
      setStep(2);
    } else if (step === 2) { // Amount step
      const minAmount = watchedDirection === 'RU_TO_RW' ? 100 : 1000;
      const valid = await trigger('sendAmount');
      if (!valid || watchedAmount < minAmount) {
        toast.error(`Minimum transfer amount is ${minAmount} ${watchedDirection === 'RU_TO_RW' ? 'RUB' : 'RWF'}`);
        return;
      }
      if (!exchangeRate) {
        toast.error("Please wait for exchange rate calculation");
        return;
      }
      setStep(3);
    } else if (step === 3) { // Recipient step
      const validName = await trigger('recipientName');
      let validDetails = false;
      if (watchedMethod === 'mobile_money') {
        validDetails = await trigger('recipientPhone');
        if (!watch('recipientPhone')) {
          toast.error("Please enter recipient phone number");
          return;
        }
      } else {
        validDetails = await trigger(['recipientBank', 'recipientAccount']);
        if (!watch('recipientBank') || !watch('recipientAccount')) {
          toast.error("Please enter bank details");
          return;
        }
      }

      if (validName && validDetails) {
        await createOrder();
      }
    } else if (step === 4) { // Payment step
      setStep(5);
    } else if (step === 5) { // Proof step
      if (!paymentProof) {
        toast.error("Please upload a proof of payment");
        return;
      }
      handleFinalize();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const createOrder = async () => {
    setIsSubmitting(true);
    try {
      const data = form.getValues();
      const sendCurrency = watchedDirection === 'RU_TO_RW' ? 'RUB' : 'RWF';
      const receiveCurrency = watchedDirection === 'RU_TO_RW' ? 'RWF' : 'RUB';
      const paymentMethodType = watchedDirection === 'RU_TO_RW' ? 'BANK_TRANSFER' : 'MOBILE_MONEY';

      const transferData = {
        senderName: user ? `${user.firstName} ${user.lastName}` : 'User',
        senderPhone: user?.phoneNumber || '',
        recipientName: data.recipientName,
        recipientPhone: data.deliveryMethod === 'mobile_money'
          ? (watchedDirection === 'RU_TO_RW' ? `+250${data.recipientPhone}` : `+7${data.recipientPhone}`)
          : data.recipientAccount!,
        recipientNetwork: data.deliveryMethod === 'mobile_money' ? (data.recipientNetwork || 'MTN') : undefined,
        sendAmount: data.sendAmount,
        sendCurrency: sendCurrency,
        receiveCurrency: receiveCurrency,
        direction: watchedDirection,
        paymentMethodType: paymentMethodType,
        deliveryMethod: data.deliveryMethod,
        notes: data.deliveryMethod === 'bank_account'
          ? `Bank: ${data.recipientBank}, Account: ${data.recipientAccount}. ${data.notes || ''}`
          : data.notes,
      };

      console.log('Creating transfer with data:', transferData);

      const result = await transferService.createTransferOrder(transferData as any);
      console.log('Transfer created successfully:', result);
      setCreatedTransfer((result as any).transfer || result);
      setStep(4); // Move to Payment step
      toast.success("Transfer order created!");
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    setIsSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      toast.success("Payment proof uploaded successfully!");
      navigate(`/transfers/${createdTransfer?.id || createdTransfer?.reference}`);
    } catch (error) {
      toast.error("Failed to upload proof");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // --- Render Steps ---

  const renderStep0_Direction = () => (
    <div className="space-y-6 animate-fade-in">
      <Card className="bg-surface-dark border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Landmark className="h-5 w-5 mr-2 text-primary" />
            Choose Transfer Direction
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-1">Select whether you are sending from Russia to Rwanda or vice versa.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={cn(
                "cursor-pointer border-2 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all",
                watchedDirection === 'RU_TO_RW' ? "border-primary bg-primary/10" : "border-white/10 hover:border-primary/40"
              )}
              onClick={() => setValue('direction', 'RU_TO_RW')}
            >
              <div className="flex items-center gap-2 mb-4">
                <img src="https://flagcdn.com/w40/ru.png" className="w-10 h-7 object-cover rounded-sm shadow-sm" alt="RU" />
                <ArrowRight className={cn("h-6 w-6", watchedDirection === 'RU_TO_RW' ? "text-primary" : "text-muted-foreground")} />
                <img src="https://flagcdn.com/w40/rw.png" className="w-10 h-7 object-cover rounded-sm shadow-sm" alt="RW" />
              </div>
              <div className={cn("font-bold text-lg", watchedDirection === 'RU_TO_RW' ? "text-white" : "text-muted-foreground")}>Russia to Rwanda</div>
              <div className="text-sm text-muted-foreground mt-1">Send RUB, Receive RWF</div>
            </div>

            <div
              className={cn(
                "cursor-pointer border-2 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all",
                watchedDirection === 'RW_TO_RU' ? "border-primary bg-primary/10" : "border-white/10 hover:border-primary/40"
              )}
              onClick={() => setValue('direction', 'RW_TO_RU')}
            >
              <div className="flex items-center gap-2 mb-4">
                <img src="https://flagcdn.com/w40/rw.png" className="w-10 h-7 object-cover rounded-sm shadow-sm" alt="RW" />
                <ArrowRight className={cn("h-6 w-6", watchedDirection === 'RW_TO_RU' ? "text-primary" : "text-muted-foreground")} />
                <img src="https://flagcdn.com/w40/ru.png" className="w-10 h-7 object-cover rounded-sm shadow-sm" alt="RU" />
              </div>
              <div className={cn("font-bold text-lg", watchedDirection === 'RW_TO_RU' ? "text-white" : "text-muted-foreground")}>Rwanda to Russia</div>
              <div className="text-sm text-muted-foreground mt-1">Send RWF, Receive RUB</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleNext}
        className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-background-dark rounded-xl font-bold"
      >
        Continue to Amount
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );

  const renderStep1_Amount = () => {
    const sendCurrency = watchedDirection === 'RU_TO_RW' ? 'RUB' : 'RWF';
    const receiveCurrency = watchedDirection === 'RU_TO_RW' ? 'RWF' : 'RUB';
    const sendFlag = watchedDirection === 'RU_TO_RW' ? 'ru' : 'rw';
    const receiveFlag = watchedDirection === 'RU_TO_RW' ? 'rw' : 'ru';
    const minAmount = watchedDirection === 'RU_TO_RW' ? 100 : 1000;

    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="bg-surface-dark border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-primary" />
              Enter Amount to Send
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* You Send */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">You send</label>
              <div className="flex items-center gap-3 p-4 bg-background-dark rounded-xl border border-white/10 focus-within:border-primary/50 transition-colors">
                <Input
                  type="number"
                  className="text-3xl font-bold border-0 bg-transparent focus-visible:ring-0 p-0 flex-1 text-white"
                  placeholder="0.00"
                  {...form.register("sendAmount")}
                />
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                  <span className="font-bold text-lg text-white">{sendCurrency}</span>
                  <img src={`https://flagcdn.com/w40/${sendFlag}.png`} className="w-7 h-5 object-cover rounded-sm shadow-sm" alt={sendCurrency} />
                </div>
              </div>
              {watchedAmount < minAmount && (
                <p className="text-red-500 text-sm mt-1">Minimum transfer amount is {minAmount} {sendCurrency}</p>
              )}
            </div>

            {/* Exchange Icon */}
            <div className="flex justify-center -my-3 relative z-10">
              <div className="bg-surface-dark p-2 rounded-full border border-white/10 shadow-lg">
                <RefreshCw className={cn("h-5 w-5 text-primary", isLoadingRate && "animate-spin")} />
              </div>
            </div>

            {/* Recipient Gets */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Recipient gets</label>
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="text-3xl font-bold text-primary flex-1">
                  {isLoadingRate ? (
                    <span className="flex items-center gap-2 text-xl">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Calculating...
                    </span>
                  ) : (
                    exchangeRate?.convertedAmount?.toLocaleString() || '0'
                  )}
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="font-bold text-lg text-primary">{receiveCurrency}</span>
                  <img src={`https://flagcdn.com/w40/${receiveFlag}.png`} className="w-7 h-5 object-cover rounded-sm shadow-sm" alt={receiveCurrency} />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-background-dark/50 rounded-xl p-5 space-y-4 text-sm border border-white/10 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Exchange Rate</span>
                <span className="font-bold text-primary text-base">1 {sendCurrency} = {exchangeRate?.rate?.toFixed(4) || '...'} {receiveCurrency}</span>
              </div>
              <div className="h-px bg-white/5"></div>
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">Fee</span>
                <span className="font-bold text-green-400">FREE</span>
              </div>
              <div className="h-px bg-white/5"></div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-white font-bold text-lg">Total to Pay</span>
                <span className="font-extrabold text-white text-2xl">
                   {sendCurrency === 'RUB' ? '₽' : ''} {exchangeRate?.totalAmount?.toLocaleString() || '...'} {sendCurrency === 'RWF' ? 'RWF' : ''}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex-1 h-14 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl font-bold"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="flex-[2] h-14 text-lg bg-primary hover:bg-primary/90 text-background-dark rounded-xl font-bold shadow-lg"
            disabled={isLoadingRate || !exchangeRate || watchedAmount < minAmount}
          >
            Continue to Recipient
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderStep2_Recipient = () => {
    const isRuToRw = watchedDirection === 'RU_TO_RW';
    const recipientCountryFlag = isRuToRw ? 'rw' : 'ru';
    const recipientCountryCode = isRuToRw ? '+250' : '+7';
    const recipientPhonePlaceholder = isRuToRw ? '788 000 000' : '900 123 4567';
    const recipientPhoneLength = isRuToRw ? 9 : 10;
    
    const bankOptions = isRuToRw ? (
      <>
        <SelectItem value="bk">Bank of Kigali (BK)</SelectItem>
        <SelectItem value="equity">Equity Bank</SelectItem>
        <SelectItem value="im">I&M Bank</SelectItem>
        <SelectItem value="cogebanque">Cogebanque</SelectItem>
        <SelectItem value="access">Access Bank</SelectItem>
        <SelectItem value="gt">GT Bank</SelectItem>
      </>
    ) : (
      <>
        <SelectItem value="sberbank">Sberbank</SelectItem>
        <SelectItem value="tinkoff">Tinkoff Bank</SelectItem>
        <SelectItem value="vtb">VTB Bank</SelectItem>
        <SelectItem value="alfabank">Alfa-Bank</SelectItem>
      </>
    );

    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="bg-surface-dark border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <User className="h-5 w-5 mr-2 text-primary" />
              Recipient Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Delivery Method Options */}
            <div className="grid grid-cols-2 gap-4">
              <div
                className={cn(
                  "cursor-pointer border-2 rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all",
                  watchedMethod === 'mobile_money' ? "border-primary bg-primary/10" : "border-white/10 hover:border-primary/40 hover:bg-white/5"
                )}
                onClick={() => setValue('deliveryMethod', 'mobile_money')}
              >
                <Smartphone className={cn("h-8 w-8 mb-3", watchedMethod === 'mobile_money' ? "text-primary" : "text-muted-foreground")} />
                <div className={cn("font-bold", watchedMethod === 'mobile_money' ? "text-white" : "text-muted-foreground")}>Mobile Money</div>
                <div className="text-xs text-muted-foreground mt-1">{isRuToRw ? 'MTN, Airtel Rwanda' : 'SBP / Telephone'}</div>
              </div>

              <div
                className={cn(
                  "cursor-pointer border-2 rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all",
                  watchedMethod === 'bank_account' ? "border-primary bg-primary/10" : "border-white/10 hover:border-primary/40 hover:bg-white/5"
                )}
                onClick={() => setValue('deliveryMethod', 'bank_account')}
              >
                <Landmark className={cn("h-8 w-8 mb-3", watchedMethod === 'bank_account' ? "text-primary" : "text-muted-foreground")} />
                <div className={cn("font-bold", watchedMethod === 'bank_account' ? "text-white" : "text-muted-foreground")}>Bank Account</div>
                <div className="text-xs text-muted-foreground mt-1">{isRuToRw ? 'Rwanda Local Banks' : 'Russian Local Banks'}</div>
              </div>
            </div>

            {/* Recipient Form */}
            <div className="space-y-5 pt-6 border-t border-white/10">
              <FormField
                control={control}
                name="recipientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-medium">Recipient Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={isRuToRw ? "e.g. MUNEZERO Marie Claire" : "e.g. IVANOV Ivan Ivanovich"}
                        className="h-14 text-lg bg-background-dark border-white/10 text-white placeholder:text-muted-foreground rounded-xl focus:border-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedMethod === 'mobile_money' ? (
                <FormField
                  control={control}
                  name="recipientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-medium">Mobile Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg flex items-center gap-2">
                            <img src={`https://flagcdn.com/w20/${recipientCountryFlag}.png`} className="w-6 h-4 object-cover rounded-sm shadow-sm" alt={recipientCountryFlag} />
                            {recipientCountryCode}
                          </span>
                          <Input
                            placeholder={recipientPhonePlaceholder}
                            className="h-14 pl-24 text-xl bg-background-dark border-white/10 text-white placeholder:text-muted-foreground rounded-xl focus:border-primary"
                            {...field}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              if (val.length <= recipientPhoneLength) {
                                field.onChange(val);
                              }
                            }}
                            maxLength={recipientPhoneLength}
                          />
                        </div>
                      </FormControl>
                      <p className="text-[10px] text-muted-foreground px-2 mt-1">
                        Enter digits only. Correct format: {recipientCountryCode} {recipientPhonePlaceholder}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-5 animate-slide-up">
                  <FormField
                    control={control}
                    name="recipientBank"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white font-medium">Select {isRuToRw ? 'Rwanda' : 'Russian'} Bank</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="h-14 bg-background-dark border-white/10 text-white rounded-xl focus:border-primary">
                              <SelectValue placeholder="Choose a bank" />
                            </SelectTrigger>
                            <SelectContent className="bg-surface-dark border-white/10">
                              {bankOptions}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="recipientAccount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white font-medium">Account Number / Card Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={isRuToRw ? "e.g. 0004567890" : "Enter account or 16-digit card number"}
                            className="h-14 text-lg bg-background-dark border-white/10 text-white placeholder:text-muted-foreground rounded-xl focus:border-primary"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex-1 h-14 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl font-bold"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex-[2] h-14 text-lg bg-primary hover:bg-primary/90 text-background-dark rounded-xl font-bold shadow-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue to Payment
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderStep3_Payment = () => {
    const totalAmount = createdTransfer?.totalAmount || exchangeRate?.totalAmount || form.getValues('sendAmount');
    const sendCurrency = watchedDirection === 'RU_TO_RW' ? 'RUB' : 'RWF';
    
    const isRuToRw = watchedDirection === 'RU_TO_RW';
    const paymentTitle = isRuToRw ? 'Russian Bank Transfer' : 'Rwandan Payout Info';
    
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="bg-surface-dark border-white/10 shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary/50 to-primary"></div>
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center text-xl font-bold">
              <Landmark className="h-6 w-6 mr-3 text-primary" />
              Complete Your Payment
            </CardTitle>
            <p className="text-muted-foreground text-sm mt-1">Please use the details below to fulfill your transfer.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-background-dark rounded-2xl p-6 border border-white/10 space-y-6 shadow-inner">
              {/* Payment Summary Header */}
              <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-2xl shadow-lg",
                    isRuToRw ? "bg-blue-600 text-white" : "bg-yellow-500 text-black"
                  )}>
                    {isRuToRw ? 'S' : 'M'}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg leading-none mb-1">{isRuToRw ? 'Sberbank' : 'MTN MoMo'}</h3>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{paymentTitle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Pay Exactly</div>
                  <div className="text-2xl font-black text-primary leading-none">
                    {isRuToRw ? '₽' : ''} {Number(totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {sendCurrency}
                  </div>
                </div>
              </div>

              {/* Dynamic Details Area */}
              <div className="grid gap-4">
                {isRuToRw ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-surface-dark/50 rounded-xl border border-white/5 flex justify-between items-center group">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase font-bold mb-1 opacity-60">Bank Name</div>
                        <div className="text-base font-bold text-white">Sberbank Russia</div>
                      </div>
                      <Landmark className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>

                    <div className="p-4 bg-surface-dark/50 rounded-xl border border-white/5 flex justify-between items-center group">
                      <div className="w-full">
                        <div className="text-xs text-muted-foreground uppercase font-bold mb-1 opacity-60">Card Number</div>
                        <div className="text-lg font-mono font-bold text-white tracking-widest break-all">
                          {cardSettings?.cardNumber || "2202 2083 4078 0023"}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2 hover:bg-primary/20 hover:text-primary text-muted-foreground rounded-full"
                        onClick={() => copyToClipboard(cardSettings?.cardNumber?.replace(/\s/g, '') || "2202208340780023")}
                      >
                        <Copy className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="p-4 bg-surface-dark/50 rounded-xl border border-white/5 flex justify-between items-center group">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase font-bold mb-1 opacity-60">Card Holder</div>
                        <div className="text-base font-bold text-white uppercase">{cardSettings?.cardHolderName || "Kabeho Merite"}</div>
                      </div>
                      <User className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-surface-dark/50 rounded-xl border border-white/5 flex justify-between items-center group">
                      <div className="w-full">
                        <div className="text-xs text-muted-foreground uppercase font-bold mb-1 opacity-60 text-yellow-500">Mobile Number</div>
                        <div className="text-xl font-mono font-bold text-white tracking-widest break-all">
                          {cardSettings?.rwandaMobileMoney || "0788 000 000"}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2 hover:bg-yellow-500/20 hover:text-yellow-500 text-muted-foreground rounded-full"
                        onClick={() => copyToClipboard(cardSettings?.rwandaMobileMoney || "0788000000")}
                      >
                        <Copy className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="p-4 bg-surface-dark/50 rounded-xl border border-white/5 flex justify-between items-center group">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase font-bold mb-1 opacity-60 text-yellow-500">Business Name</div>
                        <div className="text-lg font-bold text-white uppercase italic">{cardSettings?.rwandaRecipientName || "SKYLINE TRANSFERS"}</div>
                      </div>
                      <User className="h-5 w-5 text-yellow-500/50 group-hover:text-yellow-500 transition-colors" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex-1 h-14 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl font-bold"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="flex-[2] h-14 text-lg bg-primary hover:bg-primary/90 text-background-dark rounded-xl font-bold shadow-xl flex items-center justify-center gap-2"
          >
            Upload Payment Proof
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderStep4_Proof = () => {
    const transferRef = createdTransfer?.reference || createdTransfer?.id || 'N/A';
    const totalAmount = createdTransfer?.totalAmount || exchangeRate?.totalAmount || form.getValues('sendAmount');
    const sendCurrency = watchedDirection === 'RU_TO_RW' ? 'RUB' : 'RWF';

    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="bg-surface-dark border-white/10 shadow-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center text-xl font-bold">
              <Upload className="h-6 w-6 mr-3 text-primary" />
              Upload Payment Proof
            </CardTitle>
            <p className="text-muted-foreground text-sm">Attach your screenshot or receipt to start processing.</p>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Short Summary Card */}
            <div className="bg-background-dark/80 rounded-2xl p-6 border border-white/5 shadow-inner">
               <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Paying Amount</span>
                  <span className="text-2xl font-black text-white">{sendCurrency} {Number(totalAmount).toLocaleString()}</span>
               </div>
               <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Order Reference</span>
                  <span className="text-sm font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">{transferRef}</span>
               </div>
            </div>

            {/* Dropzone Wrapper */}
            <div className="space-y-4">
               <label className="text-white font-bold text-sm uppercase tracking-wider pl-1">Payment Confirmation</label>
               <div
                  className={cn(
                    "border-4 border-dashed rounded-3xl p-10 transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[220px]",
                    paymentProof 
                      ? "border-primary bg-primary/5 scale-[1.01]" 
                      : "border-white/10 bg-white/5 hover:border-primary/50 hover:bg-primary/5"
                  )}
                  onClick={() => document.getElementById('proof-upload-input')?.click()}
               >
                  <input
                    id="proof-upload-input"
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPaymentProof(e.target.files[0]);
                      }
                    }}
                  />

                  {paymentProof ? (
                    <div className="flex flex-col items-center gap-4 animate-in zoom-in-50">
                      <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-primary border-4 border-primary">
                        <Check className="h-10 w-10 font-bold" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-white font-bold text-lg max-w-[280px] break-all px-2">{paymentProof.name}</p>
                        <p className="text-muted-foreground text-sm uppercase font-black">Ready to submit</p>
                      </div>
                      <Button variant="link" className="text-primary hover:text-primary/70 h-auto p-0 underline">Change File</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center space-y-5 group-hover:scale-105 transition-transform duration-300">
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-primary/50">
                         <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="space-y-2">
                         <p className="text-white font-black text-xl">Click or drag receipt</p>
                         <p className="text-muted-foreground text-sm max-w-[200px] mx-auto">Upload a screenshot from your banking app showing the transfer details.</p>
                      </div>
                    </div>
                  )}
               </div>
               <div className="flex items-center gap-3 px-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                  <Landmark className="h-3 w-3" />
                  Max Size 10MB · PNG, JPG or PDF
               </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex-1 h-14 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl font-bold"
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!paymentProof || isSubmitting}
            className="flex-[2] h-14 text-xl bg-primary hover:bg-primary/90 text-background-dark rounded-xl font-black shadow-xl"
          >
            {isSubmitting ? (
               <>
                 <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                 Completing...
               </>
            ) : (
               'Complete Transfer Now'
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
      {/* Premium Step Indicator */}
      <div className="flex justify-between items-center mb-12 relative px-2">
        <div className="absolute top-[20px] left-8 right-8 h-[2px] bg-white/5 z-0"></div>
        {[
          { icon: <Landmark className="h-5 w-5" />, label: "Target" },
          { icon: <RefreshCw className="h-5 w-5" />, label: "Amount" },
          { icon: <User className="h-5 w-5" />, label: "Info" },
          { icon: <CreditCard className="h-5 w-5" />, label: "Pay" },
          { icon: <Check className="h-5 w-5" />, label: "Finish" }
        ].map((s, i) => (
          <div key={i} className="relative z-10 flex flex-col items-center gap-3 group">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-500",
              step === i + 1
                ? "bg-primary border-primary text-background-dark scale-125 shadow-[0_0_20px_rgba(255,255,255,0.2)] rounded-lg"
                : step > i + 1
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-surface-dark border-white/10 text-muted-foreground"
            )}>
              {step > i + 1 ? <Check className="h-5 w-5 font-bold" /> : s.icon}
            </div>
            <span className={cn(
              "text-[9px] uppercase font-black tracking-[0.2em] transition-colors duration-500",
              step === i + 1 ? "text-primary" : "text-muted-foreground/60"
            )}>
              {s.label}
            </span>
            {step === i + 1 && (
               <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_primary]"></div>
            )}
          </div>
        ))}
      </div>

      <Form {...form}>
        <div className="relative">
          {step === 1 && renderStep0_Direction()}
          {step === 2 && renderStep1_Amount()}
          {step === 3 && renderStep2_Recipient()}
          {step === 4 && renderStep3_Payment()}
          {step === 5 && renderStep4_Proof()}
        </div>
      </Form>
    </div>
  );
};

export default SendMoney;