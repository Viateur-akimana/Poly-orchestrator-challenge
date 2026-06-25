import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Building2, Clock, Zap, Copy, Upload, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { QRCodeSVG } from 'qrcode.react';

interface PaymentOption {
  method: string;
  title: string;
  description: string;
  instructions: string[];
  sberbankDetails?: {
    cardNumber: string;
    cardHolder: string;
    amount: string;
    comment: string;
  };
  qrCode?: string;
  expiresAt?: string;
}

interface PaymentInstructions {
  transferId: string;
  amount: number;
  options: PaymentOption[];
}

export default function SelfServicePaymentPage() {
  const { transferId } = useParams<{ transferId: string }>();
  const navigate = useNavigate();
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [manualVerification, setManualVerification] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadPaymentInstructions();
  }, [transferId]);

  const loadPaymentInstructions = async () => {
    try {
      const response = await apiClient.get(`/self-service/${transferId}/payment-instructions?amount=15000`);
      setInstructions(response.data.data);

      // Auto-select SBP if available
      const sbpOption = response.data.data.options.find((opt: PaymentOption) => opt.method === 'SBP_QR_CODE');
      if (sbpOption) {
        //        setSelectedMethod('SBP_QR_CODE');
      }
    } catch (error: any) {
      toast.error('Failed to load payment instructions');
      navigate('/transfers');
    } finally {
      setLoading(false);
    }
  };

  const handleOneClickPayment = async (method: string) => {
    try {
      setSubmitting(true);

      const response = await apiClient.post(`/self-service/${transferId}/submit-payment`, {
        paymentMethod: method,
        paymentDetails: {
          confirmation: true,
          paymentDate: new Date().toISOString()
        }
      });

      const result = response.data.data;

      if (result.success && result.status === 'CONFIRMED') {
        setCompleted(true);
        setSubmitting(false);
        toast.success('✅ Payment verified! MTN payout initiated.');

        setTimeout(() => {
          navigate(`/transfers/${transferId}`);
        }, 2000);
      } else if (result.status === 'PENDING_VERIFICATION') {
        setSubmitting(false);
        setVerifying(true);
        toast.info('⏳ Verifying payment...');
        startStatusPolling();
      } else {
        // Automatic verification failed - go to manual verification
        setSubmitting(false);
        setManualVerification(true);
        toast.warning('⚠️ Automatic verification failed.');
        toast.info('📞 Manual verification required - please upload payment proof.');
      }

    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to process payment');
      setSubmitting(false);
    }
  };

  const startStatusPolling = () => {
    let pollCount = 0;
    const maxPolls = 20; // Poll for 10 minutes

    const pollInterval = setInterval(async () => {
      try {
        pollCount++;
        const response = await apiClient.get(`/self-service/${transferId}/status`);
        const status = response.data.data;

        if (status?.success && status?.status === 'CONFIRMED') {
          clearInterval(pollInterval);
          setVerifying(false);
          setCompleted(true);
          toast.success('✅ Payment verified! MTN payout initiated.');

          setTimeout(() => {
            navigate(`/transfers/${transferId}`);
          }, 2000);
        } else if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          setVerifying(false);
          setManualVerification(true);
          toast.warning('⏳ Automatic verification timed out.');
          toast.info('📞 Switching to manual verification - please upload payment proof.');
        }
      } catch (error) {
        console.log('Status polling error:', error);
      }
    }, 30000); // Poll every 30 seconds
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Full screen loading spinner
  if (loading || submitting) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-lg font-medium text-foreground">
            {loading ? 'Loading payment details...' : 'Processing payment...'}
          </p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-success/20 bg-success/10">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">Payment Verified!</h2>
              <p className="text-muted-foreground">Money is being sent to Rwanda</p>
            </div>
            <Button onClick={() => navigate(`/transfers/${transferId}`)} className="bg-primary hover:bg-primary/90 text-background-dark">
              View Transfer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingProof(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('transferId', transferId!);
      formData.append('type', 'payment_proof');

      await apiClient.post(`/transfers/${transferId}/upload-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Payment proof uploaded successfully');
    } catch (error: any) {
      toast.error('Failed to upload proof');
    } finally {
      setUploadingProof(false);
    }
  };

  if (manualVerification) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-warning/20 bg-warning/10">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <Clock className="h-16 w-16 text-warning mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">Manual Verification Required</h2>
              <p className="text-muted-foreground">Upload payment proof to speed up verification</p>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-warning/30 rounded-lg p-6">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="proof-upload"
                  disabled={uploadingProof}
                />
                <label htmlFor="proof-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="h-8 w-8 text-warning" />
                    <p className="text-foreground font-medium">
                      {uploadingProof ? 'Uploading...' : 'Upload Payment Screenshot'}
                    </p>
                    <p className="text-sm text-muted-foreground">PNG, JPG or PDF</p>
                  </div>
                </label>
              </div>

              <Button onClick={() => navigate(`/transfers/${transferId}`)} className="bg-primary hover:bg-primary/90 text-background-dark">
                View Transfer Status
              </Button>
              <p className="text-xs text-muted-foreground">Contact support: support@skylinetransfers.com</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verifying) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-primary/20 bg-primary/10">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="relative h-16 w-16 mx-auto">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Verifying Payment...</h2>
              <p className="text-muted-foreground">Please wait while we confirm your transfer with Sberbank</p>
              <p className="text-sm text-muted-foreground mt-2">This usually takes 30-60 seconds</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show method selection first
  if (!selectedMethod) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center space-x-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/transfers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Complete Payment</h1>
        </div>

        <div className="space-y-4">
          {instructions?.options.map((option) => (
            <Card
              key={option.method}
              className="border-2 hover:border-primary/40 cursor-pointer shadow-sm hover:shadow-md transition-all"
              onClick={() => setSelectedMethod(option.method)}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  {option.method === 'SBP_QR_CODE' ? (
                    <div className="p-3 bg-primary/10 rounded-full">
                      <QrCode className="h-6 w-6 text-primary" />
                    </div>
                  ) : (
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">{option.title}</h3>
                      {option.method === 'SBP_QR_CODE' && (
                        <Badge className="bg-primary text-background-dark hover:bg-primary/90">Instant</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show selected payment method interface
  const selectedOption = instructions?.options.find(opt => opt.method === selectedMethod);
  if (!selectedOption) return null;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => setSelectedMethod(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{selectedOption.title}</h1>
      </div>

      <div className="space-y-6">

        {/* SBP QR Code View */}
        {selectedOption.method === 'SBP_QR_CODE' && selectedOption.qrCode && (
          <Card className="border-2 border-primary/20 shadow-md">
            <CardContent className="pt-6 text-center space-y-6">
              <div className="bg-card p-6 rounded-xl border border-border inline-block shadow-sm">
                {/* Render standard QR code from the payload */}
                <QRCodeSVG
                  value={selectedOption.qrCode}
                  size={256}
                  level="M"
                  includeMargin={true}
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">Scan to Pay</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Open your banking app (Sberbank, Tinkoff, etc.) and scan this QR code to confirm payment.
                </p>
              </div>

              <div className="bg-primary/10 p-4 rounded-lg flex items-start text-left text-sm text-foreground">
                <Zap className="h-5 w-5 mr-3 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-semibold mb-1">Instant Verification</p>
                  <p>We'll automatically detect your payment within seconds. No need to upload a receipt.</p>
                </div>
              </div>

              <Button
                onClick={() => {
                  setVerifying(true);
                  startStatusPolling();
                }}
                className="w-full bg-primary hover:bg-primary/90 text-background-dark py-6 text-lg font-semibold h-auto"
              >
                <div className="flex items-center justify-center space-x-3">
                  <CheckCircle className="h-6 w-6" />
                  <span>I Have Scanned It</span>
                </div>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Manual Transfer View */}
        {selectedOption.method === 'SBERBANK_MANUAL' && selectedOption.sberbankDetails && (
          <Card className="border-2 border-primary/20 bg-primary/10">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl text-foreground">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-card p-4 rounded-lg border border-border text-center">
                <p className="text-sm text-muted-foreground mb-2">Card Number:</p>
                <div className="flex items-center justify-center space-x-2">
                  <p className="text-xl font-mono font-bold">{selectedOption.sberbankDetails.cardNumber}</p>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(selectedOption.sberbankDetails!.cardNumber, 'Card number')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{selectedOption.sberbankDetails.cardHolder}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card p-4 rounded-lg border border-border text-center">
                  <p className="text-sm text-muted-foreground mb-2">Amount:</p>
                  <div className="flex items-center justify-center space-x-2">
                    <p className="text-lg font-bold">{selectedOption.sberbankDetails.amount} RUB</p>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(selectedOption.sberbankDetails!.amount, 'Amount')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-card p-4 rounded-lg border border-border text-center">
                  <p className="text-sm text-muted-foreground mb-2">Comment:</p>
                  <div className="flex items-center justify-center space-x-2">
                    <p className="text-sm font-mono bg-warning/15 px-2 py-1 rounded font-bold">{selectedOption.sberbankDetails.comment}</p>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(selectedOption.sberbankDetails!.comment, 'Transfer ID')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {!submitting && !verifying && !completed && !manualVerification && (
                <Button
                  onClick={() => handleOneClickPayment(selectedOption.method)}
                  className="w-full bg-primary hover:bg-primary/90 text-background-dark py-3 text-lg font-semibold"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <CheckCircle className="h-5 w-5" />
                    <span>I Have Paid</span>
                  </div>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}