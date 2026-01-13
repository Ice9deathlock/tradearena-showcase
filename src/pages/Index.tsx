import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CompetitionCard from "@/components/CompetitionCard";
import { competitions } from "@/data/mockData";
import { 
  Trophy, 
  Shield, 
  BarChart3, 
  Users, 
  Zap, 
  Target,
  ArrowRight,
  CheckCircle
} from "lucide-react";

const Index = () => {
  const featuredCompetitions = competitions.filter(c => c.status === "live").slice(0, 3);

  const features = [
    {
      icon: Shield,
      title: "Simulated Trading",
      description: "Trade with virtual funds in a risk-free environment. No real money at stake.",
    },
    {
      icon: Trophy,
      title: "Guaranteed Prizes",
      description: "Prize pools are locked before competitions start. Winners always get paid.",
    },
    {
      icon: BarChart3,
      title: "Transparent Rankings",
      description: "Real-time leaderboards with verified performance metrics everyone can see.",
    },
    {
      icon: Users,
      title: "Fair Competition",
      description: "Everyone starts equal. Success depends purely on your trading skills.",
    },
  ];

  const steps = [
    { step: "01", title: "Choose a Competition", description: "Browse upcoming and live competitions that match your skill level." },
    { step: "02", title: "Enter & Trade", description: "Pay the entry fee and start trading with your simulated account." },
    { step: "03", title: "Climb the Ranks", description: "Execute your strategy and watch your ranking on the live leaderboard." },
    { step: "04", title: "Win Prizes", description: "Top performers win from the guaranteed prize pool." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden hero-gradient">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Skill-Based Trading Competitions</span>
            </div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              Prove Your Trading Skills.{" "}
              <span className="text-gradient">Win Real Prizes.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Compete against traders worldwide using simulated accounts. 
              No risk to your capital—just pure skill and strategy.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/competitions">
                <Button variant="hero" size="xl">
                  Browse Competitions
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/trading">
                <Button variant="heroOutline" size="xl">
                  Try Demo Trading
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>Simulated Accounts Only</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>Transparent Rankings</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>Guaranteed Payouts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why TradeArena?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A fair, transparent platform where trading skill is the only thing that matters.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Get started in minutes and compete for real prizes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item, index) => (
              <div key={index} className="relative">
                <div className="text-6xl font-display font-bold text-primary/10 mb-4">
                  {item.step}
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 right-0 w-1/2 h-px bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Competitions */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                Live Competitions
              </h2>
              <p className="text-muted-foreground">
                Join now and start competing
              </p>
            </div>
            <Link to="/competitions">
              <Button variant="outline">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCompetitions.map((competition) => (
              <CompetitionCard key={competition.id} {...competition} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-8 md:p-12">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent" />
            <div className="relative max-w-2xl">
              <Target className="h-12 w-12 text-primary mb-6" />
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to Test Your Skills?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join thousands of traders competing in skill-based competitions. 
                No risk to your capital—prove yourself with simulated trading.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/competitions">
                  <Button variant="hero" size="lg">
                    Start Competing
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/leaderboard">
                  <Button variant="outline" size="lg">
                    View Leaderboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
