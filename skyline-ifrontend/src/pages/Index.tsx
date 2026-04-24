import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { transferService } from "@/services/transfer.service";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [sendAmount, setSendAmount] = useState(10000);
  const [fromCurrency, setFromCurrency] = useState("RUB");
  const [toCurrency, setToCurrency] = useState("RWF");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Fetch real exchange rate from backend
  const { data: rateData, isLoading: isLoadingRate } = useQuery({
    queryKey: ['public-exchange-rate', fromCurrency, toCurrency, sendAmount],
    queryFn: () => transferService.getExchangeRate(fromCurrency, toCurrency, sendAmount),
    staleTime: 30000, // 30 seconds
  });

  const handleSwap = () => {
    setFromCurrency(prev => prev === "RUB" ? "RWF" : "RUB");
    setToCurrency(prev => prev === "RWF" ? "RUB" : "RWF");
  };

  // Use fetched exchange rate from admin settings, fallback to default
  const exchangeRate = rateData?.rate || 18.23;
  const receiveAmount = Math.round(sendAmount * exchangeRate);

  const handleSendAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid numbers
    if (value === '' || /^\d+$/.test(value)) {
      setSendAmount(value === '' ? 0 : Number(value));
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased overflow-x-hidden min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-background-light/80 dark:bg-background-dark/80 border-b border-black/5 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="text-primary">
                <span className="material-symbols-outlined text-4xl">currency_exchange</span>
              </div>
              <span className="text-xl font-bold tracking-tight">
                SKYLINE <span className="text-primary font-normal">Transfers</span>
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#how-it-works">How it Works</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#exchange-rates">Exchange Rates</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#business">Why choose us</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="/help">Help Center</a>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/login" className="px-6 py-2.5 text-sm font-bold text-white rounded-full bg-white/10 transition-colors">
                Log In
              </Link>
              <Link
                to="/register"
                className="px-6 py-2.5 text-sm font-bold text-background-dark bg-primary rounded-full hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(54,226,123,0.3)]"
              >
                Register
              </Link>
            </div>

            <button
              className="md:hidden p-2 text-white"
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-background-dark/95 backdrop-blur-lg border-b border-white/10 py-6 px-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-10 duration-300 z-50">
            <a
              className="text-lg font-medium text-white hover:text-primary transition-colors"
              href="#how-it-works"
              onClick={() => setIsMenuOpen(false)}
            >
              How it Works
            </a>
            <a
              className="text-lg font-medium text-white hover:text-primary transition-colors"
              href="#exchange-rates"
              onClick={() => setIsMenuOpen(false)}
            >
              Exchange Rates
            </a>
            <a
              className="text-lg font-medium text-white hover:text-primary transition-colors"
              href="#business"
              onClick={() => setIsMenuOpen(false)}
            >
              Why choose us
            </a>
            <a
              className="text-lg font-medium text-white hover:text-primary transition-colors"
              href="/help"
              onClick={() => setIsMenuOpen(false)}
            >
              Help Center
            </a>
            <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
              <Link
                to="/login"
                className="w-full py-3 text-center text-sm font-bold text-white rounded-full bg-white/10 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="w-full py-3 text-center text-sm font-bold text-background-dark bg-primary rounded-full hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(54,226,123,0.3)]"
                onClick={() => setIsMenuOpen(false)}
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="flex flex-col gap-8 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-dark w-fit border border-white/5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-xs font-semibold tracking-wide uppercase text-primary">Best Rates Guaranteed</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight">
                Send <span>{fromCurrency === "RUB" ? "Rubles" : "Francs"}</span>,
                <br />
                Receive <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-300">{toCurrency === "RUB" ? "Rubles" : "Francs"}</span>.
                <br />
                Instantly.
              </h1>

              <p className="text-lg text-slate-400 leading-relaxed max-w-lg">
                The fastest, most secure bridge between Russia and Rwanda. No hidden fees, just skylines connected. Join our growing community today.
              </p>

            </div>

            {/* Transfer Calculator */}
            <div className="relative group" id="exchange-rates">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-[2.5rem] blur-xl transform group-hover:scale-[1.02] transition-transform duration-500"></div>
              <div className="relative bg-surface-dark border border-white/10 p-6 sm:p-8 rounded-[2rem] shadow-2xl backdrop-blur-sm">
                <div className="flex flex-col gap-6">
                  <div className="relative">
                    <label className="text-sm font-medium text-slate-400 ml-4 mb-2 block" htmlFor="send-amount">
                      You send
                    </label>
                    <div className="flex items-center bg-background-dark border border-white/5 rounded-full p-2 pr-6 focus-within:border-primary/50 transition-colors h-20">
                      <div className="flex-1 px-4">
                        <input
                          className="bg-transparent border-none text-3xl font-bold text-white w-full focus:ring-0 p-0 placeholder-slate-600"
                          id="send-amount"
                          placeholder="0.00"
                          type="number"
                          value={sendAmount || ''}
                          onChange={handleSendAmountChange}
                          min={1}
                          step={1}
                        />
                      </div>
                      <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                        <img
                          alt={`${fromCurrency} Flag`}
                          className="w-8 h-8 rounded-full object-cover"
                          src={fromCurrency === "RUB" ? "https://flagcdn.com/w80/ru.png" : "https://flagcdn.com/w80/rw.png"}
                        />
                        <span className="text-lg font-bold">{fromCurrency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 py-2 relative">
                    <div className="h-px bg-white/10 flex-1"></div>
                    <button 
                      onClick={handleSwap}
                      className="absolute left-1/2 -translate-x-1/2 z-10 w-10 h-10 rounded-full bg-surface-dark border border-white/10 flex items-center justify-center hover:border-primary/50 hover:bg-white/5 transition-all group/swap"
                    >
                      <span className="material-symbols-outlined text-primary group-hover/swap:rotate-180 transition-transform duration-500">sync_alt</span>
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-primary font-mono mx-6">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                      1 {fromCurrency} = {isLoadingRate ? '...' : exchangeRate.toFixed(fromCurrency === "RUB" ? 2 : 5)} {toCurrency}
                    </div>
                    <div className="h-px bg-white/10 flex-1"></div>
                  </div>

                  <div className="relative">
                    <label className="text-sm font-medium text-slate-400 ml-4 mb-2 block" htmlFor="receive-amount">
                      They receive
                    </label>
                    <div className="flex items-center bg-background-dark border border-white/5 rounded-full p-2 pr-6 focus-within:border-primary/50 transition-colors h-20">
                      <div className="flex-1 px-4">
                        <div className="text-3xl font-bold text-primary w-full">
                          {isLoadingRate ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            receiveAmount.toLocaleString()
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                        <img
                          alt={`${toCurrency} Flag`}
                          className="w-8 h-8 rounded-full object-cover"
                          src={toCurrency === "RUB" ? "https://flagcdn.com/w80/ru.png" : "https://flagcdn.com/w80/rw.png"}
                        />
                        <span className="text-lg font-bold">{toCurrency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between px-4 text-sm text-slate-400">
                    <span>Arrives by</span>
                    <span className="text-white font-medium">In 5-30 minutes</span>
                  </div>

                  <Link
                    to="/register"
                    className="w-full h-16 bg-primary hover:bg-primary/90 text-background-dark text-lg font-bold rounded-full mt-2 transition-all transform active:scale-[0.98] shadow-[0_4px_20px_rgba(54,226,123,0.4)] flex items-center justify-center gap-2"
                  >
                    Get Started
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 border-y border-white/5 bg-surface-dark/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/5">
            <div className="p-4">
              <div className="text-4xl font-bold text-white mb-2">100+</div>
              <div className="text-slate-400 text-sm uppercase tracking-wider font-medium">Successful Transfers</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-bold text-white mb-2">1.5M+</div>
              <div className="text-slate-400 text-sm uppercase tracking-wider font-medium">RUB Transferred</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-bold text-white mb-2">&lt; 15 Mins</div>
              <div className="text-slate-400 text-sm uppercase tracking-wider font-medium">Average Speed</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Simple steps to send money</h2>
            <p className="text-lg text-slate-400">We've stripped away the complexity. Sending money is now as easy as sending a text.</p>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-surface-dark via-primary/50 to-surface-dark z-0"></div>
            <div className="grid md:grid-cols-3 gap-12 relative z-10">
              <div className="flex flex-col items-center text-center group">
                <div className="w-24 h-24 bg-surface-dark rounded-full border border-white/10 flex items-center justify-center mb-6 shadow-lg group-hover:border-primary/50 transition-colors duration-300">
                  <span className="material-symbols-outlined text-4xl text-primary">person_add</span>
                </div>
                <h3 className="text-xl font-bold mb-3">1. Register & Calculate</h3>
                <p className="text-slate-400 leading-relaxed">Create your account and enter the amount you want to send. See the exact rate and fees upfront.</p>
              </div>

              <div className="flex flex-col items-center text-center group">
                <div className="w-24 h-24 bg-surface-dark rounded-full border border-white/10 flex items-center justify-center mb-6 shadow-lg group-hover:border-primary/50 transition-colors duration-300">
                  <span className="material-symbols-outlined text-4xl text-primary">account_balance</span>
                </div>
                <h3 className="text-xl font-bold mb-3">2. Pay to Sberbank</h3>
                <p className="text-slate-400 leading-relaxed">Transfer the Rubles to our secure Russian bank account (Sberbank) and upload your payment receipt.</p>
              </div>

              <div className="flex flex-col items-center text-center group">
                <div className="w-24 h-24 bg-surface-dark rounded-full border border-white/10 flex items-center justify-center mb-6 shadow-lg group-hover:border-primary/50 transition-colors duration-300">
                  <span className="material-symbols-outlined text-4xl text-primary">smartphone</span>
                </div>
                <h3 className="text-xl font-bold mb-3">3. Instant Payout</h3>
                <p className="text-slate-400 leading-relaxed">Once verified, we send the RWF directly to the recipient's MTN or Airtel Mobile Money wallet.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 bg-surface-dark/20" id="business">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">Why thousands choose SKYLINE</h2>
              <p className="text-lg text-slate-400 mb-10">We beat the banks on exchange rates and delivery speed, every single day.</p>

              <div className="grid gap-6">
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-surface-dark border border-white/5 hover:border-primary/30 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">bolt</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">Instant Delivery</h3>
                    <p className="text-slate-400 text-sm">Funds arrive in mobile wallets or bank accounts in minutes, not days.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 rounded-2xl bg-surface-dark border border-white/5 hover:border-primary/30 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">security</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">Secure Payments</h3>
                    <p className="text-slate-400 text-sm">We use encrypted connections and manual verification to ensure every transfer is safe.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 rounded-2xl bg-surface-dark border border-white/5 hover:border-primary/30 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">trending_up</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">Best Exchange Rates</h3>
                    <p className="text-slate-400 text-sm">Real market rates without the hefty markups traditional banks charge.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 relative">
              <div className="relative rounded-3xl overflow-hidden aspect-square lg:aspect-[4/5] shadow-2xl border border-white/10 group">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
                <img
                  alt="Happy person using mobile phone for money transfer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGmOZJjMN-UZFKruvtFHEUULib1N5J6oFdjyFAdtTx314I1IuK_-p63U2u0NWY308DhpUK0Lq3rcDH8_mGBFmDZBzKCfpqghqg6TygB4xAHpTaRC5yhxsemxqmNSP6b32LS4L_JGjbLx1AMu076xhewdMpfteT10Y1n2sNlz_PHZEr7pjAIhB9BgGm41Os7qQEcDUUs8uGCj8rPlK5d99obZqAOxBT77ClkU1NyvJf3_uSOZQDZR4_V6QROGzDcKHzUQnBKBgi_P5I"
                />
                <div className="absolute bottom-8 left-8 right-8 z-20">
                  <div className="bg-surface-dark/90 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">format_quote</span>
                      </div>
                      <div>
                        <p className="font-bold text-white">Alexey K.</p>
                        <p className="text-xs text-slate-400">Sent RUB via Sberbank</p>
                      </div>
                    </div>
                    <p className="text-slate-300 italic">"I sent money to my family in Kigali using Sberbank transfer. They received it in minutes. Best rate I've found."</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>




      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto bg-primary rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-black/10 rounded-full translate-x-1/2 translate-y-1/2 blur-2xl"></div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold text-background-dark mb-6 tracking-tight">Ready to send money?</h2>
            <p className="text-xl text-background-dark/80 max-w-2xl mx-auto mb-10 font-medium">
              Join thousands of people who trust Skyline for their international transfers to Rwanda.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="px-8 py-4 bg-background-dark text-white text-lg font-bold rounded-full hover:bg-background-dark/90 transition-colors shadow-lg"
              >
                Create Free Account
              </Link>
              <a
                className="px-8 py-4 bg-white/20 text-background-dark text-lg font-bold rounded-full hover:bg-white/30 transition-colors backdrop-blur-sm"
                href="#help-center"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16 bg-surface-dark/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-3xl text-primary">currency_exchange</span>
                <span className="text-xl font-bold">SKYLINE</span>
              </div>
              <p className="text-slate-400 max-w-xs mb-6">Fast, secure, and low-cost money transfers from Russia to Rwanda.</p>
              <div className="flex gap-4">
                <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-background-dark transition-all text-white" href="#">
                  <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      clipRule="evenodd"
                      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                      fillRule="evenodd"
                    ></path>
                  </svg>
                </a>
                <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-background-dark transition-all text-white" href="#">
                  <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                  </svg>
                </a>
                <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-background-dark transition-all text-white" href="#">
                  <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      clipRule="evenodd"
                      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.468 2.93c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                      fillRule="evenodd"
                    ></path>
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                <li>
                  <a className="text-slate-400 hover:text-primary transition-colors text-sm" href="#">About Us</a>
                </li>
                <li>
                  <a className="text-slate-400 hover:text-primary transition-colors text-sm" href="#">Careers</a>
                </li>
                <li>
                  <a className="text-slate-400 hover:text-primary transition-colors text-sm" href="#">Press</a>
                </li>
                <li>
                  <a className="text-slate-400 hover:text-primary transition-colors text-sm" href="#">News</a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Resources</h4>
              <ul className="space-y-3">
                <li>
                  <a className="text-slate-400 hover:text-primary transition-colors text-sm" href="#">Blog</a>
                </li>
                <li>
                  <a className="text-slate-400 hover:text-primary transition-colors text-sm" href="/help">Help Center</a>
                </li>
                <li>
                  <a className="text-slate-400 hover:text-primary transition-colors text-sm" href="#exchange-rates">Exchange Rates</a>
                </li>
                <li>
                  <a className="text-slate-400 hover:text-primary transition-colors text-sm" href="#">Security</a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                <li>
                  <a className="text-slate-400 hover:text-primary transition-colors text-sm" href="#">Privacy Policy</a>
                </li>
                <li>
                  <a className="text-slate-400 hover:text-primary transition-colors text-sm" href="#">Terms of Service</a>
                </li>
                <li>
                  <a className="text-slate-400 hover:text-primary transition-colors text-sm" href="#">Cookie Policy</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">© {new Date().getFullYear()} SKYLINE Transfers. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;