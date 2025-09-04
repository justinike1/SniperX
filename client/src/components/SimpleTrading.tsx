import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SimpleTrading() {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Quick Trading Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Button id="buyBtn" className="bg-green-600 hover:bg-green-700">
              Buy
            </Button>
            <Button id="sellBtn" className="bg-red-600 hover:bg-red-700">
              Sell
            </Button>
            <Button id="simulateBtn" className="bg-blue-600 hover:bg-blue-700">
              Simulate
            </Button>
            <Button id="startBotBtn" className="bg-purple-600 hover:bg-purple-700">
              Start Bot
            </Button>
            <Button id="stopBotBtn" variant="destructive">
              Stop Bot
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Log</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px] w-full rounded-md border p-4">
            <div 
              id="statusLog" 
              className="font-mono text-sm text-green-400 space-y-1"
            />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}