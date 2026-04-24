/**
 * Multi-Step Transfer Wizard
 * Flow: Amount → Recipient → Payment → Proof → Complete
 * Integrated with real Sberbank APIs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { transferService } from '@/services/transfer.service';
import { adminService } from '@/services/admin.service';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Smartphone,
  Building2,
  CreditCard,
  Banknote,
  CheckCircle2,
  Upload,
  Info,
  Clock,
  Loader2,
  QrCode,
  Scan
} from 'lucide-react';

// Types
interface TransferFormData {
  // Step 1: Amount
  sendAmount: number;
  sendCurrency: string;
  receiveCurrency: string;
  direction: 'RU_TO_RW' | 'RW_TO_RU';

  // Step 2: Recipient
  deliveryMethod: 'mobile_money' | 'bank_account';
  recipientName: string;
  recipientPhone: string;
  recipientBank?: string;
  recipientAccountNumber?: string;

  // Step 3: Payment
  paymentChannel: 'sber' | 'cash' | 'mtn_momo';
}

interface QuoteData {
  rate: number;
  competitorRate: number;
  rateDifference: number;
  fixedFee: number;
  percentageFee: number;
  totalFee: number;
  receiveAmount: number;
  totalAmount: number;
  deliveryOptions: {
    bank: string;
    mobileMoney: string;
  };
}

interface PaymentInfo {
  bankName: string;
  cardNumber: string;
  cardHolder: string;
  amount: number;
  qrCode?: string;
  sbpLink?: string;
}

// Step names for the header
const STEPS = ['Direction', 'Amount', 'Recipient', 'Payment', 'Proof', 'Complete'];

// Progress bar component
const StepProgress: React.FC<{ currentStep: number; steps: string[] }> = ({ currentStep, steps }) => {
  return (
    <div className="w-full mb-8">
      {/* Step labels */}
      <div className="flex justify-between mb-2">
        {steps.map((step, index) => (
          <span
            key={step}
            className={`text-sm font-medium ${index + 1 <= currentStep ? 'text-brand' : 'text-muted-foreground'
              }`}
          >
            {step}
          </span>
        ))}
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-brand transition-all duration-300"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
};

// Main Component
const MultiStepTransferWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [createdTransfer, setCreatedTransfer] = useState<any>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  const [formData, setFormData] = useState<TransferFormData>({
    sendAmount: 10000,
    sendCurrency: 'RUB',
    receiveCurrency: 'RWF',
    direction: 'RU_TO_RW',
    deliveryMethod: 'mobile_money',
    recipientName: '',
    recipientPhone: '',
    recipientBank: '',
    recipientAccountNumber: '',
    paymentChannel: 'sber',
  });

  const [quote, setQuote] = useState<QuoteData>({
    rate: 0, 
    competitorRate: 16.9388,
    rateDifference: 0,
    fixedFee: 0,
    percentageFee: 0,
    totalFee: 0,
    receiveAmount: 0,
    totalAmount: 10000,
    deliveryOptions: {
      bank: '1-3 hours',
      mobileMoney: 'Instant - 10 min',
    },
  });


  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    bankName: 'Sber',
    cardNumber: '...',
    cardHolder: '...',
    amount: formData.sendAmount,
  });

  // Fetch card settings from backend
  const { data: cardSettings } = useQuery({
    queryKey: ['card-settings'],
    queryFn: adminService.getCardSettings,
  });

  // Update payment info when card settings are loaded
  useEffect(() => {
    if (cardSettings) {
      setPaymentInfo(prev => ({
        ...prev,
        cardNumber: cardSettings.cardNumber,
        cardHolder: cardSettings.cardHolderName,
      }));
    }
  }, [cardSettings]);

  // Fetch exchange rate from backend
  const fetchExchangeRate = useCallback(async (amount: number, direction: 'RU_TO_RW' | 'RW_TO_RU') => {
    const minAmount = direction === 'RU_TO_RW' ? 1000 : 10000;
    if (amount < minAmount) return;

    setIsLoadingQuote(true);
    try {
      const from = direction === 'RU_TO_RW' ? 'RUB' : 'RWF';
      const to = direction === 'RU_TO_RW' ? 'RWF' : 'RUB';
      const rateData = await transferService.getExchangeRate(from, to, amount, direction);
      setQuote(prev => ({
        ...prev,
        rate: rateData.rate,
        receiveAmount: rateData.convertedAmount,
        totalFee: rateData.fee,
        totalAmount: rateData.totalAmount,
        rateDifference: Math.round((rateData.rate - (direction === 'RU_TO_RW' ? 16.9388 : 0.054)) * 10000) / 10000,
      }));
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
    } finally {
      setIsLoadingQuote(false);
    }
  }, []);

  // Fetch payment info from backend (including QR code)
  const fetchPaymentInfo = useCallback(async () => {
    try {
      const info = await transferService.getPaymentInfo(formData.direction);
      if (info) {
        if (formData.direction === 'RU_TO_RW') {
          setPaymentInfo({
            bankName: info.cardDetails?.bankName || 'Sber',
            cardNumber: info.cardDetails?.cardNumber || '2202208018882457',
            cardHolder: info.cardDetails?.cardHolder || 'Melissa uwase',
            amount: formData.sendAmount,
            qrCode: info.qrCode || info.qrCodeUrl,
            sbpLink: info.sbpLink || info.paymentUrl,
          });
        } else {
          // RW to RU payment info (MTN)
          setPaymentInfo({
            bankName: 'MTN MoMo',
            cardNumber: 'Merchant ID: 622020',
            cardHolder: 'SKYLINE TRANSFERS',
            amount: formData.sendAmount,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment info:', error);
    }
  }, [formData.direction, formData.sendAmount]);

  // Fetch quote when amount or direction changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const minAmount = formData.direction === 'RU_TO_RW' ? 1000 : 10000;
      if (formData.sendAmount >= minAmount) {
        fetchExchangeRate(formData.sendAmount, formData.direction);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.sendAmount, formData.direction, fetchExchangeRate]);

  // Fetch payment info when reaching payment step
  useEffect(() => {
    if (currentStep === 3) {
      fetchPaymentInfo();
    }
  }, [currentStep, fetchPaymentInfo]);

  // Create transfer mutation using the transfer order API
  const createTransferMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('Mutation starting with data:', data);
      return transferService.createTransferOrder(data);
    },
    onSuccess: (response) => {
      console.log('Mutation success, response:', response);
      setCreatedTransfer(response);
      toast.success('Transfer created successfully!');
      setCurrentStep(4); // Move to proof step
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      toast.error(error.response?.data?.error?.message || error.message || 'Failed to create transfer');
    },
  });

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Auto-set payment channel based on direction
      if (formData.direction === 'RW_TO_RU') {
        setFormData(prev => ({ ...prev, paymentChannel: 'mtn_momo' }));
      } else {
        setFormData(prev => ({ ...prev, paymentChannel: 'sber' }));
      }
      setCurrentStep(3);
    } else if (currentStep === 4) {
      // Create transfer when moving from payment to proof
      const phone = formData.direction === 'RU_TO_RW' 
        ? (formData.deliveryMethod === 'mobile_money' ? `+250${formData.recipientPhone}` : formData.recipientAccountNumber)
        : formData.recipientPhone; // Generic for Russia side

      const transferData = {
        senderName: user ? `${user.firstName} ${user.lastName}` : 'User',
        senderPhone: user?.phoneNumber || '',
        recipientName: formData.recipientName,
        recipientPhone: phone || '',
        recipientNetwork: formData.direction === 'RU_TO_RW' ? 'MTN' : undefined,
        sendAmount: formData.sendAmount,
        amountRUB: formData.sendAmount, // Backward compatibility
        sendCurrency: formData.direction === 'RU_TO_RW' ? 'RUB' : 'RWF',
        receiveCurrency: formData.direction === 'RU_TO_RW' ? 'RWF' : 'RUB',
        direction: formData.direction === 'RU_TO_RW' ? 'RU_TO_RW' : 'RW_TO_RU',
        paymentMethod: formData.paymentChannel === 'sber' ? 'BANK_TRANSFER' : (formData.paymentChannel === 'cash' ? 'CASH' : 'MOBILE_MONEY'),
        deliveryMethod: formData.deliveryMethod,
        notes: formData.direction === 'RU_TO_RW' 
          ? `Delivery: ${formData.deliveryMethod}, Bank: ${formData.recipientBank || 'N/A'}`
          : `Payout to Russia Bank/SBP for: ${formData.recipientName}`,
      };

      console.log('Creating transfer with:', transferData);
      createTransferMutation.mutate(transferData);
    } else {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  };

  const handleSwapDirection = () => {
    const newDirection = formData.direction === 'RU_TO_RW' ? 'RW_TO_RU' : 'RU_TO_RW';
    setFormData(prev => ({
      ...prev,
      direction: newDirection,
      sendCurrency: newDirection === 'RU_TO_RW' ? 'RUB' : 'RWF',
      receiveCurrency: newDirection === 'RU_TO_RW' ? 'RWF' : 'RUB',
      sendAmount: newDirection === 'RU_TO_RW' ? 10000 : 184000,
      recipientPhone: '', // Clear to avoid cross-country phone formats
    }));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Step 1: Direction Choice
  const DirectionStep = () => (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-1">Choose Direction</h2>
          <p className="text-muted-foreground">Where are you sending money?</p>
        </div>

        <div className="grid gap-4">
          <button
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                direction: 'RU_TO_RW',
                sendCurrency: 'RUB',
                receiveCurrency: 'RWF',
                sendAmount: 10000,
                paymentChannel: 'sber',
                deliveryMethod: 'mobile_money'
              }));
              setCurrentStep(2);
            }}
            className={`flex items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
              formData.direction === 'RU_TO_RW' ? 'border-brand bg-brand/5 shadow-md' : 'border-border hover:border-brand/30 hover:bg-muted'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
               <img src="https://flagcdn.com/w40/ru.png" className="w-8 h-5 object-cover rounded-sm" alt="RU" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-bold text-lg">Russia to Rwanda</h3>
              <p className="text-sm text-muted-foreground">Send Rubles via Sberbank/Tinkoff to MTN/Airtel</p>
            </div>
          </button>

          <button
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                direction: 'RW_TO_RU',
                sendCurrency: 'RWF',
                receiveCurrency: 'RUB',
                sendAmount: 184000,
                paymentChannel: 'mtn_momo',
                deliveryMethod: 'bank_account'
              }));
              setCurrentStep(2);
            }}
            className={`flex items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
              formData.direction === 'RW_TO_RU' ? 'border-brand bg-brand/5 shadow-md' : 'border-border hover:border-brand/30 hover:bg-muted'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
               <img src="https://flagcdn.com/w40/rw.png" className="w-8 h-5 object-cover rounded-sm" alt="RW" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-bold text-lg">Rwanda to Russia</h3>
              <p className="text-sm text-muted-foreground">Send RWF via MTN MoMo to Russia Bank/SBP</p>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );

  // Step 1: Amount
  const AmountStep = () => (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6 space-y-6">
        {/* Send Amount */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-muted-foreground">You send</Label>
            <button 
              onClick={handleSwapDirection}
              className="text-xs flex items-center gap-1 text-brand hover:underline"
            >
              <ArrowLeft className="w-3 h-3" /> Swap Direction
            </button>
          </div>
          <div className="flex items-center gap-3 p-4 bg-muted rounded-xl border border-border/50 focus-within:border-brand/50 transition-colors">
            <Input
              type="number"
              value={formData.sendAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, sendAmount: parseFloat(e.target.value) || 0 }))}
              className="text-3xl font-bold border-0 bg-transparent focus-visible:ring-0 p-0 flex-1"
              placeholder="0.00"
            />
            <div className="flex items-center gap-2 px-3 py-1 bg-background/50 rounded-lg border border-border/50">
              <span className="font-bold text-lg">{formData.sendCurrency}</span>
              <img 
                src={formData.direction === "RU_TO_RW" ? "https://flagcdn.com/w40/ru.png" : "https://flagcdn.com/w40/rw.png"} 
                className="w-7 h-5 object-cover rounded-sm" 
                alt={formData.sendCurrency} 
              />
            </div>
          </div>
        </div>

        {/* Receive Amount */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Recipient gets</Label>
          <div className="flex items-center gap-3 p-4 bg-brand/5 rounded-xl border border-brand/20">
            <div className="text-3xl font-bold text-brand flex-1">
              {isLoadingQuote ? (
                <span className="flex items-center gap-2 text-xl">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Calculating...
                </span>
              ) : (
                quote.receiveAmount.toLocaleString()
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-brand/10 rounded-lg border border-brand/20">
              <span className="font-bold text-lg text-brand">{formData.receiveCurrency}</span>
              <img 
                src={formData.direction === "RU_TO_RW" ? "https://flagcdn.com/w40/rw.png" : "https://flagcdn.com/w40/ru.png"} 
                className="w-7 h-5 object-cover rounded-sm" 
                alt={formData.receiveCurrency} 
              />
            </div>
          </div>
        </div>

        {/* Zero Fee Notice */}
        <div className="flex justify-between items-center py-2">
          <span className="text-muted-foreground">Transfer fee</span>
          <span className="text-brand font-semibold">FREE (No fees)</span>
        </div>

        <div className="flex justify-between items-center py-2">
          <span className="text-muted-foreground">Our rate</span>
          <span className="text-brand font-semibold">1 RUB = {quote.rate} RWF</span>
        </div>

        {/* Continue Button */}
        <Button
          onClick={handleNext}
          className="w-full bg-brand hover:bg-brand/90 text-background-dark h-12 text-lg"
          disabled={formData.sendAmount < (formData.direction === 'RU_TO_RW' ? 1000 : 10000)}
        >
          Continue to Send {formData.sendCurrency}
        </Button>

        {/* Expandable Details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center justify-center gap-2 w-full text-muted-foreground hover:text-foreground"
        >
          {showDetails ? 'Hide' : 'Show'} details
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="space-y-4 pt-4 border-t">
            {/* Competitors Rate */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Competitors rate</span>
              <span className="text-foreground">1 RUB = {quote.competitorRate} RWF</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                Difference <Info className="w-3 h-3" />
              </span>
              <Badge variant="secondary" className="bg-muted">
                {quote.rateDifference} RWF
              </Badge>
            </div>

            {/* Fee Note */}
            <div className="pt-4 border-t">
              <div className="bg-brand/5 rounded-lg p-3 border border-brand/20">
                <p className="text-sm text-brand font-medium text-center">
                  Enjoy zero-fee transfers between Russia and Rwanda. 
                  Our service is currently free for all users.
                </p>
              </div>
            </div>

            {/* Delivery Options */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-3">Delivery options</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Bank</span>
                  <Badge variant="outline">{quote.deliveryOptions.bank}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mobile Money</span>
                  <Badge variant="outline">{quote.deliveryOptions.mobileMoney}</Badge>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-brand">
                <span className="font-medium">Amount you pay</span>
                <span className="font-semibold">₽ {formData.sendAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-brand">
                <span className="font-medium">Recipient receives</span>
                <span className="font-semibold">Rwf {quote.receiveAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Step 2: Recipient
  const RecipientStep = () => (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-1">Recipient Details</h2>
          <p className="text-muted-foreground">Who is receiving the money in {formData.direction === 'RU_TO_RW' ? 'Rwanda' : 'Russia'}?</p>
        </div>

        {/* Delivery Method Selection (Only for RU to RW) */}
        {formData.direction === 'RU_TO_RW' && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setFormData(prev => ({ ...prev, deliveryMethod: 'mobile_money' }))}
              className={`p-6 rounded-xl border-2 transition-all ${formData.deliveryMethod === 'mobile_money'
                ? 'border-brand bg-brand/5'
                : 'border-border hover:border-brand/40'
                }`}
            >
              <Smartphone className="w-8 h-8 mx-auto mb-3 text-brand" />
              <div className="font-semibold">Mobile Money</div>
              <div className="text-sm text-muted-foreground">MTN Rwanda</div>
            </button>

            <button
              onClick={() => setFormData(prev => ({ ...prev, deliveryMethod: 'bank_account' }))}
              className={`p-6 rounded-xl border-2 transition-all ${formData.deliveryMethod === 'bank_account'
                ? 'border-brand bg-brand/5'
                : 'border-border hover:border-brand/40'
                }`}
            >
              <Building2 className="w-8 h-8 mx-auto mb-3 text-brand" />
              <div className="font-semibold">Bank Account</div>
              <div className="text-sm text-muted-foreground">Rwandan Banks</div>
            </button>
          </div>
        )}

        {/* Recipient Details */}
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Recipient Full Name</Label>
            <Input
              placeholder="e.g. MUNEZERO Jean Claude"
              value={formData.recipientName}
              onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
              className="bg-slate-800/50 border-border text-white placeholder:text-slate-500"
            />
          </div>

          {formData.direction === 'RU_TO_RW' ? (
            formData.deliveryMethod === 'mobile_money' ? (
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="flex group">
                  <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-border bg-muted text-base font-medium transition-colors group-focus-within:border-brand/50 gap-2 text-white">
                    <img src="https://flagcdn.com/w20/rw.png" className="w-5 h-3.5 object-cover rounded-sm" alt="RW" />
                    +250
                  </span>
                  <Input
                    placeholder="788 000 000"
                    value={formData.recipientPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 9) {
                        setFormData(prev => ({ ...prev, recipientPhone: val }));
                      }
                    }}
                    className="rounded-l-none rounded-r-xl h-12 text-lg border-border bg-slate-800/50 text-white focus-visible:ring-brand/20 focus-visible:border-brand/50 placeholder:text-slate-500"
                    maxLength={9}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Bank</Label>
                   <Select
                    value={formData.recipientBank}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, recipientBank: value }))}
                  >
                    <SelectTrigger className="bg-slate-800/50 text-white border-border">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BK">Bank of Kigali</SelectItem>
                      <SelectItem value="BPR">BPR Bank (KCB)</SelectItem>
                      <SelectItem value="Equity">Equity Bank</SelectItem>
                      <SelectItem value="I&M">I&M Bank</SelectItem>
                      <SelectItem value="Ecobank">Ecobank Rwanda</SelectItem>
                      <SelectItem value="Access">Access Bank</SelectItem>
                      <SelectItem value="NCBA">NCBA Bank</SelectItem>
                      <SelectItem value="Zigama">Zigama CSS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    placeholder="e.g. 1234567890"
                    value={formData.recipientAccountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipientAccountNumber: e.target.value }))}
                    className="bg-slate-800/50 border-border text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient Bank Account / SBP Phone in Russia</Label>
                <div className="flex group">
                  <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-border bg-muted text-base font-medium transition-colors group-focus-within:border-brand/50 gap-2 text-white">
                    <img src="https://flagcdn.com/w20/ru.png" className="w-5 h-3.5 object-cover rounded-sm" alt="RU" />
                    +7
                  </span>
                  <Input
                    placeholder="900 000 00 00"
                    value={formData.recipientPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) {
                        setFormData(prev => ({ ...prev, recipientPhone: val }));
                      }
                    }}
                    className="rounded-l-none rounded-r-xl h-12 text-lg border-border bg-slate-800/50 text-white focus-visible:ring-brand/20 focus-visible:border-brand/50 placeholder:text-slate-500"
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bank Name (e.g. Sber, Tinkoff)</Label>
                <Input
                  placeholder="e.g. Sberbank"
                  value={formData.recipientBank}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipientBank: e.target.value }))}
                  className="bg-slate-800/50 border-border text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4 pt-4">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1 bg-brand hover:bg-brand/90 text-background-dark"
            disabled={!formData.recipientName || !formData.recipientPhone}
          >
            Continue to Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Step 3: Payment
  const PaymentStep = () => (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-1">Make Payment</h2>
          <p className="text-muted-foreground">{formData.direction === 'RU_TO_RW' ? 'Transfer RUB to our Sberbank card' : 'Pay via MTN Mobile Money (*182*7*1#)'}</p>
        </div>

        {formData.direction === 'RU_TO_RW' ? (
          <div className="space-y-6">
            <div className="bg-muted/40 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-brand" />
                <div>
                  <div className="text-sm text-muted-foreground">SBERBANK DETAILS</div>
                  <div className="font-semibold">{paymentInfo.cardHolder}</div>
                </div>
              </div>
              <div className="bg-card rounded-lg p-3 border border-border">
                <div className="text-xs text-muted-foreground mb-1">CARD NUMBER</div>
                <div className="flex justify-between items-center">
                  <span className="font-mono font-medium">{paymentInfo.cardNumber}</span>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(paymentInfo.cardNumber)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="bg-brand/5 rounded-xl p-4 border border-brand/20">
              <h4 className="font-semibold text-brand mb-2">Instructions</h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>1. Transfer {formData.sendAmount} RUB to the card above</li>
                <li>2. Take a screenshot of the confirmation</li>
                <li>3. Upload it in the next step</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
             <div className="bg-brand/5 rounded-xl p-6 text-center border border-brand/20">
              <div className="text-2xl font-bold text-brand mb-4">Dial *182*7*1#</div>
              <div className="space-y-3 text-left max-w-xs mx-auto">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Merchant ID:</span>
                  <span className="font-bold">622020</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold">{formData.sendAmount.toLocaleString()} RWF</span>
                </div>
              </div>
            </div>
            <div className="bg-muted/40 rounded-xl p-4">
              <h4 className="font-semibold mb-2 text-center">Fast Verification</h4>
              <p className="text-sm text-muted-foreground text-center">
                Once you pay, please upload the SMS notification or a screenshot of your MoMo transaction history.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1 bg-brand hover:bg-brand/90 text-background-dark"
          >
            Continue to Upload Proof
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Step 4: Proof Upload
  const ProofStep = () => {
    // Fallback if transfer wasn't created
    if (!createdTransfer) {
      return (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1 text-red-600">Error: Transfer Not Created</h2>
              <p className="text-muted-foreground">Failed to create transfer. Please try again.</p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => {
                  setCurrentStep(4);
                  window.scrollTo(0, 0);
                }}
                className="flex-1"
              >
                Back to Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-1">Upload Payment Proof</h2>
            <p className="text-muted-foreground">Upload a screenshot of your payment confirmation</p>
          </div>

          {/* Upload Area */}
          <label className="block">
            <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${paymentProofFile ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50 hover:bg-muted'
              }`}>
              {paymentProofFile ? (
                <div className="space-y-2">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-success" />
                  <p className="font-medium text-foreground">{paymentProofFile.name}</p>
                  <p className="text-sm text-muted-foreground">Click to change file</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
            />
          </label>

          {/* Transfer Summary */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-3">
            <h4 className="font-semibold">Transfer Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient</span>
                <span className="font-medium">{formData.recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount sent</span>
                <span className="font-medium">{formData.sendAmount.toLocaleString()} RUB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount received</span>
                <span className="font-medium">{quote.receiveAmount.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-xs">{createdTransfer?.reference || 'SKY-XXXXXX'}</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 bg-brand hover:bg-brand/90 text-background-dark"
              disabled={!paymentProofFile}
            >
              Complete Transfer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 5: Complete
  const CompleteStep = () => (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-8 text-center space-y-6">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Transfer Submitted!</h2>
          <p className="text-muted-foreground">
            Your transfer is being processed. We'll notify you once it's complete.
          </p>
        </div>

        {/* Transfer Details */}
        <div className="bg-muted/40 rounded-xl p-4 text-left space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reference</span>
            <span className="font-mono font-medium">{createdTransfer?.reference || 'SKY-' + Date.now()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recipient</span>
            <span className="font-medium">{formData.recipientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">{quote.receiveAmount.toLocaleString()} RWF</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge className="bg-warning/15 text-warning">Processing</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Estimated delivery</span>
            <div className="flex items-center gap-1 text-brand">
              <Clock className="w-4 h-4" />
              <span className="font-medium">
                {formData.deliveryMethod === 'mobile_money' ? '10 minutes' : '1-3 hours'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={() => navigate('/transfers')}
            className="w-full bg-brand hover:bg-brand/90 text-background-dark"
          >
            View My Transfers
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setCurrentStep(1);
              setFormData({
                direction: 'RU_TO_RW',
                sendAmount: 10000,
                sendCurrency: 'RUB',
                receiveCurrency: 'RWF',
                deliveryMethod: 'mobile_money',
                recipientName: '',
                recipientPhone: '',
                recipientBank: '',
                recipientAccountNumber: '',
                paymentChannel: 'sber',
              });
              setPaymentProofFile(null);
            }}
            className="w-full"
          >
            Send Another Transfer
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <DirectionStep />;
      case 2: return <AmountStep />;
      case 3: return <RecipientStep />;
      case 4: return <PaymentStep />;
      case 5: return <ProofStep />;
      case 6: return <CompleteStep />;
      default: return <DirectionStep />;
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💸</span>
            <h1 className="text-xl font-bold">Send Money</h1>
          </div>
        </div>

        {/* Progress */}
        <StepProgress currentStep={currentStep} steps={STEPS} />

        {/* Step Content */}
        {renderStep()}
      </div>
    </div>
  );
};

export default MultiStepTransferWizard;
