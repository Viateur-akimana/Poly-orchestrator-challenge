import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Save,
  RefreshCw,
  AlertTriangle,
  Loader2,
  CreditCard,
  Smartphone,
  Landmark,
  User
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { toast } from "sonner";

const AdminSettings = () => {
  // Russian Card Settings
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  
  // Rwandan Payout Settings
  const [rwandaMobileMoney, setRwandaMobileMoney] = useState('');
  const [rwandaRecipientName, setRwandaRecipientName] = useState('');
  const [rwandaBankAccount, setRwandaBankAccount] = useState('');
  
  const [settingsHasChanges, setSettingsHasChanges] = useState(false);
  const [settingsExist, setSettingsExist] = useState(false);

  // Exchange Rate Settings
  const [rubToRwf, setRubToRwf] = useState<number>(0);
  const [rwfToRub, setRwfToRub] = useState<number>(0);

  const [rateHasChanges, setRateHasChanges] = useState(false);

  const queryClient = useQueryClient();

  const { data: systemSettings, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ['card-settings'], // Keeping the same key for compatibility
    queryFn: async () => {
      const data = await adminService.getCardSettings();
      if (data) {
        setSettingsExist(!!data.cardNumber || !!data.rwandaMobileMoney);
        setCardNumber(data.cardNumber || '');
        setCardHolderName(data.cardHolderName || '');
        setRwandaMobileMoney(data.rwandaMobileMoney || '');
        setRwandaRecipientName(data.rwandaRecipientName || '');
        setRwandaBankAccount(data.rwandaBankAccount || '');
      }
      return data;
    }
  });

  const { data: rateSettings, isLoading: rateLoading, refetch: refetchRateSettings } = useQuery({
    queryKey: ['admin-exchange-rate'],
    queryFn: async () => {
      const data = await adminService.getExchangeRateSettings();
      if (data) {
        setRubToRwf(data.rubToRwf);
        setRwfToRub(data.rwfToRub);
      }
      return data;
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: () => adminService.updateCardSettings({
      cardNumber,
      cardHolderName,
      rwandaMobileMoney,
      rwandaRecipientName,
      rwandaBankAccount
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['card-settings'] });
      await refetchSettings();
      toast.success('Payment settings updated successfully');
      setSettingsHasChanges(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save payment settings');
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: () => adminService.updateExchangeRate(rubToRwf, rwfToRub),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-exchange-rate'] });
      await queryClient.invalidateQueries({ queryKey: ['public-exchange-rate'] });
      await refetchRateSettings();
      toast.success('Exchange rate updated successfully');
      setRateHasChanges(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update exchange rate');
    },
  });

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage system-wide configurations including exchange rates and destination payout details.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        
        {/* Exchange Rate Settings */}
        <Card className="bg-surface-dark border-white/10 shadow-xl overflow-hidden">
          <div className="h-1 bg-primary"></div>
          <CardHeader>
            <CardTitle className="flex items-center text-white text-lg">
              <RefreshCw className="h-5 w-5 mr-3 text-primary" />
              Currency Exchange Rates
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Define the manual rates for both directions.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {rateLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-8">
                {/* RU to RW */}
                <div className="space-y-4 p-5 bg-background-dark/50 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <img src="https://flagcdn.com/w20/ru.png" className="w-5 h-3.5 object-cover rounded-sm" alt="RU" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Russia to Rwanda</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rub-to-rwf" className="text-white text-xs font-bold uppercase opacity-60">1 RUB equals</Label>
                    <div className="flex items-center gap-3 bg-background-dark p-2 pr-4 rounded-xl border border-white/10 focus-within:border-primary/50 transition-all">
                      <Input
                        id="rub-to-rwf"
                        type="number"
                        step="0.001"
                        value={rubToRwf}
                        onChange={(e) => {
                          setRubToRwf(Number(e.target.value));
                          setRateHasChanges(true);
                        }}
                        className="h-10 text-xl font-bold border-0 bg-transparent focus-visible:ring-0 p-0 pl-4 text-white"
                      />
                      <span className="font-black text-primary">RWF</span>
                    </div>
                  </div>
                </div>

                {/* RW to RU */}
                <div className="space-y-4 p-5 bg-background-dark/50 rounded-2xl border border-white/5">
                   <div className="flex items-center gap-2 mb-2">
                    <img src="https://flagcdn.com/w20/rw.png" className="w-5 h-3.5 object-cover rounded-sm" alt="RW" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Rwanda to Russia</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rwf-to-rub" className="text-white text-xs font-bold uppercase opacity-60">1 RWF equals</Label>
                    <div className="flex items-center gap-3 bg-background-dark p-2 pr-4 rounded-xl border border-white/10 focus-within:border-primary/50 transition-all">
                      <Input
                        id="rwf-to-rub"
                        type="number"
                        step="0.000001"
                        value={rwfToRub}
                        onChange={(e) => {
                          setRwfToRub(Number(e.target.value));
                          setRateHasChanges(true);
                        }}
                        className="h-10 text-xl font-bold border-0 bg-transparent focus-visible:ring-0 p-0 pl-4 text-white"
                      />
                      <span className="font-black text-primary">RUB</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-between items-center bg-primary/5 p-4 rounded-xl border border-primary/10">
                   <div className="text-xs text-muted-foreground">
                      Last Update: <span className="text-white font-bold">{rateSettings?.lastUpdated ? new Date(rateSettings.lastUpdated).toLocaleString() : 'Just now'}</span>
                   </div>
                   <Button
                      onClick={() => updateRateMutation.mutate()}
                      disabled={updateRateMutation.isPending || !rateHasChanges}
                      className="bg-primary hover:bg-primary/90 text-background-dark font-bold px-8"
                    >
                      {updateRateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      {updateRateMutation.isPending ? 'Saving...' : 'Save Rates'}
                    </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment & Payout Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Russian Collection (RUB Inbound) */}
          <Card className="bg-surface-dark border-white/10 shadow-xl overflow-hidden">
            <div className="h-1 bg-blue-500"></div>
            <CardHeader>
              <CardTitle className="flex items-center text-white text-lg">
                <CreditCard className="h-5 w-5 mr-3 text-blue-400" />
                Russian Bank Card (RUB)
              </CardTitle>
              <p className="text-xs text-muted-foreground">Where users in Russia should send RUB funds.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase opacity-50 text-white">Sberbank Card Number</Label>
                  <Input
                    value={cardNumber}
                    onChange={(e) => { setCardNumber(e.target.value); setSettingsHasChanges(true); }}
                    className="h-12 bg-background-dark text-white border-white/10 rounded-xl focus:border-blue-500 tracking-widest text-lg font-mono placeholder:text-slate-400"
                    placeholder="0000 0000 0000 0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase opacity-50 text-white">Card Holder Name</Label>
                  <Input
                    value={cardHolderName}
                    onChange={(e) => { setCardHolderName(e.target.value); setSettingsHasChanges(true); }}
                    className="h-12 bg-background-dark text-white border-white/10 rounded-xl focus:border-blue-500 placeholder:text-slate-400"
                    placeholder="E.g. IVAN IVANOV"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rwanda Collection (RWF Inbound / Payout) */}
          <Card className="bg-surface-dark border-white/10 shadow-xl overflow-hidden">
            <div className="h-1 bg-yellow-500"></div>
            <CardHeader>
              <CardTitle className="flex items-center text-white text-lg">
                <Smartphone className="h-5 w-5 mr-3 text-yellow-400" />
                Rwandan Payout Details (RWF)
              </CardTitle>
              <p className="text-xs text-muted-foreground">Details for payouts and RWF collections in Rwanda.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase opacity-50 text-white">Merchant Code / MoMo Phone</Label>
                  <Input
                    value={rwandaMobileMoney}
                    onChange={(e) => { setRwandaMobileMoney(e.target.value); setSettingsHasChanges(true); }}
                    className="h-12 bg-background-dark text-white border-white/10 rounded-xl focus:border-yellow-500 tracking-widest text-lg font-mono placeholder:text-slate-400"
                    placeholder="e.g. 622020"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase opacity-50 text-white">Business / Recipient Name</Label>
                  <Input
                    value={rwandaRecipientName}
                    onChange={(e) => { setRwandaRecipientName(e.target.value); setSettingsHasChanges(true); }}
                    className="h-12 bg-background-dark text-white border-white/10 rounded-xl focus:border-yellow-500 placeholder:text-slate-400"
                    placeholder="E.g. SKYLINE TRANSFERS"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase opacity-50 text-white">Rwandan Bank Account (Fallback)</Label>
                  <Input
                    value={rwandaBankAccount}
                    onChange={(e) => { setRwandaBankAccount(e.target.value); setSettingsHasChanges(true); }}
                    className="h-12 bg-background-dark text-white border-white/10 rounded-xl focus:border-yellow-500 font-mono placeholder:text-slate-400"
                    placeholder="E.g. 1234567890 (BK)"
                  />
                </div>
              </div>
            </CardContent>
          </Card>


        </div>

        {/* Global Action Bar */}
        {(settingsHasChanges) && (
           <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10">
              <Card className="bg-primary shadow-[0_0_40px_rgba(0,0,0,0.5)] border-0 overflow-hidden">
                <CardContent className="p-3 px-6 flex items-center gap-6">
                   <div className="flex flex-col">
                      <span className="text-background-dark font-black text-sm">Unsaved Changes</span>
                      <span className="text-background-dark/70 text-[10px] uppercase font-bold tracking-wider">Payment details modified</span>
                   </div>
                   <div className="h-8 w-px bg-background-dark/10"></div>
                   <div className="flex gap-2">
                      <Button 
                         variant="ghost" 
                         className="text-background-dark hover:bg-background-dark/10 font-bold"
                         onClick={() => {
                            setCardNumber(systemSettings?.cardNumber || '');
                            setCardHolderName(systemSettings?.cardHolderName || '');
                            setRwandaMobileMoney(systemSettings?.rwandaMobileMoney || '');
                            setRwandaRecipientName(systemSettings?.rwandaRecipientName || '');
                            setRwandaBankAccount(systemSettings?.rwandaBankAccount || '');
                            setSettingsHasChanges(false);
                         }}
                      >
                         Reset
                      </Button>
                      <Button 
                        className="bg-background-dark text-primary hover:bg-background-dark/90 font-black px-8"
                        onClick={() => updateSettingsMutation.mutate()}
                        disabled={updateSettingsMutation.isPending}
                      >
                         {updateSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                         Save All Changes
                      </Button>
                   </div>
                </CardContent>
              </Card>
           </div>
        )}

      </div>
    </div>
  );
};

export default AdminSettings;