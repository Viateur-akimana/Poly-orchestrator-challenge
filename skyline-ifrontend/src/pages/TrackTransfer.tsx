import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Search, Loader2 } from "lucide-react";
import transferService, { TransferOrderDto } from "@/services/transfer.service";
import { toast } from "sonner";
import { generateTransferReceipt } from "@/lib/receipt-generator";
import { Download } from "lucide-react";

const trackingSchema = z.object({
  reference: z.string().min(1, 'Enter reference number'),
});

const TrackTransfer = () => {
  const [transfer, setTransfer] = useState<TransferOrderDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const form = useForm({
    resolver: zodResolver(trackingSchema),
    defaultValues: { reference: '' },
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setSearched(true);
    try {
      const result = await transferService.getTransferOrders({
        reference: data.reference,
        limit: 1
      });
      setTransfer(result.data.length > 0 ? result.data[0] : null);
      if (result.data.length === 0) {
        toast.error('Transfer not found');
      }
    } catch {
      toast.error('Failed to track transfer');
      setTransfer(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-emerald-500/20 text-emerald-400",
      processing: "bg-primary/20 text-primary",
      pending: "bg-amber-500/20 text-amber-400",
      pending_payment: "bg-amber-500/20 text-amber-400",
      failed: "bg-red-500/20 text-red-400",
    };
    return colors[status.toLowerCase()] || colors.pending;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Track Transfer</h1>

      <Card className="bg-surface-dark border-white/10">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        placeholder="Reference number"
                        className="h-10 bg-background-dark border-white/10 text-white"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={loading} className="bg-brand hover:bg-brand/90">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {searched && transfer && (
        <Card className="bg-surface-dark border-white/10">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">Status</CardTitle>
              <Badge className={getStatusColor(transfer.status)}>
                {transfer.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Reference</p>
                <p className="text-white font-medium">{transfer.reference}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recipient</p>
                <p className="text-white font-medium">{transfer.recipientName}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Sent</p>
                <p className="text-white font-bold">{Number(transfer.sendAmount).toLocaleString()} {(transfer as any).fromCurrency?.code || (transfer as any).sendCurrency || 'RUB'}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Fee</p>
                <p className="text-emerald-400 font-bold">FREE</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Receives</p>
                <p className="text-emerald-400 font-bold">{Number(transfer.receiveAmount).toLocaleString()} {(transfer as any).toCurrency?.code || (transfer as any).receiveCurrency || 'RWF'}</p>
              </div>
            </div>

            {transfer.status.toLowerCase() === 'completed' && (
              <div className="pt-4 border-t border-white/10">
                <Button 
                  onClick={() => generateTransferReceipt(transfer)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {searched && !transfer && (
        <Card className="bg-surface-dark border-white/10">
          <CardContent className="py-6 text-center">
            <p className="text-muted-foreground mb-4">Transfer not found</p>
            <Button
              variant="outline"
              onClick={() => {
                form.reset();
                setSearched(false);
              }}
              className="border-white/10 text-white hover:bg-white/10"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrackTransfer;