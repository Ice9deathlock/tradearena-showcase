import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface OrderHistoryTableProps {
  accountId: string | undefined;
}

const OrderHistoryTable = ({ accountId }: OrderHistoryTableProps) => {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["order-history", accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          instruments (symbol)
        `)
        .eq("account_id", accountId)
        .order("requested_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!accountId,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "filled":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Filled</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case "cancelled":
        return <Badge className="bg-muted text-muted-foreground">Cancelled</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-[200px]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="text-left p-3 font-medium">Time</th>
            <th className="text-left p-3 font-medium">Symbol</th>
            <th className="text-left p-3 font-medium">Side</th>
            <th className="text-left p-3 font-medium">Type</th>
            <th className="text-left p-3 font-medium">Qty</th>
            <th className="text-left p-3 font-medium">Price</th>
            <th className="text-left p-3 font-medium">SL</th>
            <th className="text-left p-3 font-medium">TP</th>
            <th className="text-center p-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders?.length ? (
            orders.map((order) => (
              <tr key={order.id} className="border-b border-border hover:bg-secondary/50">
                <td className="p-3 text-muted-foreground text-xs">
                  {new Date(order.requested_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="p-3 font-medium text-foreground">
                  {(order.instruments as any)?.symbol || "-"}
                </td>
                <td className="p-3">
                  <span className={order.side === "buy" ? "text-chart-up" : "text-chart-down"}>
                    {order.side.toUpperCase()}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground capitalize">{order.order_type}</td>
                <td className="p-3 text-foreground">{order.quantity}</td>
                <td className="p-3 text-foreground">
                  {order.filled_price ? Number(order.filled_price).toFixed(5) : "-"}
                </td>
                <td className="p-3 text-muted-foreground">
                  {order.stop_loss ? Number(order.stop_loss).toFixed(5) : "-"}
                </td>
                <td className="p-3 text-muted-foreground">
                  {order.take_profit ? Number(order.take_profit).toFixed(5) : "-"}
                </td>
                <td className="p-3 text-center">{getStatusBadge(order.status)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9} className="p-4 text-center text-muted-foreground">
                No orders yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OrderHistoryTable;
