import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Clock, Trophy, ArrowDownRight, ArrowLeft, Building2, Loader2, ArrowUpRight, DollarSign } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { Badge } from "@/components/ui/badge";

const WalletPage = () => {
  const navigate = useNavigate();
  const [showWithdrawFlow, setShowWithdrawFlow] = useState(false);
  const { wallet, transactions, isLoading } = useWallet();

  const walletBalance = wallet?.balance || 0;

  const handleWithdrawClick = () => {
    setShowWithdrawFlow(true);
  };

  const handleBackToWallet = () => {
    setShowWithdrawFlow(false);
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <ArrowDownRight className="h-4 w-4 text-green-400" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-red-400" />;
  };

  const getTransactionLabel = (tx: { type: string; competition_name?: string }) => {
    switch (tx.type) {
      case "entry_fee":
        return `Entry Fee - ${tx.competition_name || "Competition"}`;
      case "prize":
        return `Prize - ${tx.competition_name || "Competition"}`;
      case "deposit":
        return "Deposit";
      case "withdrawal":
        return "Withdrawal";
      default:
        return tx.type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  // Withdrawal Confirmation View
  if (showWithdrawFlow) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl">
            {/* Back Link */}
            <button
              onClick={handleBackToWallet}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Wallet
            </button>

            {/* Header */}
            <div className="mb-8">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                Withdrawal Request
              </h1>
              <p className="text-muted-foreground">
                Review your withdrawal details before confirming
              </p>
            </div>

            {/* Withdrawal Summary Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm mb-6">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-lg">Withdrawal Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Amount */}
                <div className="rounded-lg bg-background/50 border border-border p-4">
                  <p className="text-sm text-muted-foreground mb-1">Withdrawal Amount</p>
                  <p className="font-display text-3xl font-bold text-primary">
                    ${walletBalance.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Full available balance
                  </p>
                </div>

                {/* Payout Method */}
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Payout Method</p>
                  <div className="rounded-lg border border-border bg-background/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Bank Transfer</p>
                        <p className="text-sm text-muted-foreground">Account ending in ****4829</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Processing Time */}
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Estimated Processing Time</p>
                  <div className="rounded-lg border border-border bg-background/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">3-5 Business Days</p>
                        <p className="text-sm text-muted-foreground">Standard processing time for bank transfers</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirmation Details */}
                <div className="rounded-lg bg-muted/20 border border-border p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Withdrawal Amount</span>
                    <span className="font-medium text-foreground">${walletBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processing Fee</span>
                    <span className="font-medium text-foreground">$0.00</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-medium text-foreground">Total Payout</span>
                    <span className="font-display font-bold text-primary">${walletBalance.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Info Note */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 mb-8">
              <p className="text-sm text-muted-foreground leading-relaxed">
                By confirming this withdrawal, funds will be transferred from your TradeArena wallet to your registered bank account. All withdrawals are processed within the estimated timeframe and you will receive a confirmation email once complete.
              </p>
            </div>

            {/* Confirm Button */}
            <div className="flex justify-center">
              <Button variant="hero" size="lg" className="px-12" disabled={walletBalance <= 0}>
                Confirm Withdrawal
              </Button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Main Wallet View
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Wallet & Earnings
            </h1>
            <p className="text-muted-foreground">
              Track your competition fees and earnings
            </p>
          </div>

          {/* Balance Card */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm mb-10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Total Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-4xl font-bold text-foreground mb-1">
                ${walletBalance.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                {wallet?.currency || "USD"}
              </p>
            </CardContent>
          </Card>

          {/* Withdraw Section */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm mb-10">
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                    Withdraw Your Earnings
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Request a withdrawal of your available balance. All earnings come from verified prize pools.
                  </p>
                </div>
                <Button className="shrink-0 gap-2" onClick={handleWithdrawClick} disabled={walletBalance <= 0}>
                  <ArrowDownRight className="h-4 w-4" />
                  Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Note */}
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4 mb-10">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">How it works:</span> Your wallet is used for competition entry fees and prize winnings. Entry fees are deducted when you join paid competitions, and prizes are credited when competitions end.
            </p>
          </div>

          {/* Transaction History */}
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">
              Transaction History
            </h2>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
              {transactions.length === 0 ? (
                <CardContent className="py-12 text-center">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                    No transactions yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Join a competition to see your first transaction!
                  </p>
                  <Button onClick={() => navigate("/competitions")}>
                    Browse Competitions
                  </Button>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Transaction
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/10 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                                {getTransactionIcon(tx.type, tx.amount)}
                              </div>
                              <span className="font-medium text-foreground">
                                {getTransactionLabel(tx)}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {getStatusBadge(tx.status)}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span
                              className={`font-display font-semibold ${
                                tx.amount > 0 ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toLocaleString()}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right text-sm text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WalletPage;
