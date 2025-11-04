import EventEmitter from 'eventemitter3';

export interface TradeTask {
  id: string;
  type: 'BUY' | 'SELL';
  token: string;
  amount: number;
  denom: 'SOL' | 'USD' | 'TOKEN';
  slippagePct?: number;
  createdAt: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result?: any;
  error?: string;
}

type TaskHandler = (task: TradeTask) => Promise<void>;

class TradeQueue extends EventEmitter {
  private queue: TradeTask[] = [];
  private processing = false;
  private handlers = new Map<string, TaskHandler>();
  private maxRetries = 3;

  constructor() {
    super();
    console.log('⚙️ Trade Queue initialized');
  }

  registerHandler(type: 'BUY' | 'SELL', handler: TaskHandler) {
    this.handlers.set(type, handler);
  }

  enqueue(task: Omit<TradeTask, 'id' | 'createdAt' | 'status'>): string {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullTask: TradeTask = {
      ...task,
      id,
      createdAt: Date.now(),
      status: 'QUEUED'
    };

    this.queue.push(fullTask);
    this.emit('task:queued', fullTask);
    
    console.log(`📥 Task queued: ${id} - ${task.type} ${task.amount} ${task.denom} of ${task.token}`);
    
    this.processQueue();
    
    return id;
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue[0];
      
      if (task.status !== 'QUEUED') {
        this.queue.shift();
        continue;
      }

      task.status = 'PROCESSING';
      this.emit('task:processing', task);

      const handler = this.handlers.get(task.type);
      
      if (!handler) {
        console.error(`❌ No handler for task type: ${task.type}`);
        task.status = 'FAILED';
        task.error = `No handler for type ${task.type}`;
        this.emit('task:failed', task);
        this.queue.shift();
        continue;
      }

      let retries = 0;
      let success = false;

      while (retries < this.maxRetries && !success) {
        try {
          await handler(task);
          task.status = 'COMPLETED';
          this.emit('task:completed', task);
          console.log(`✅ Task completed: ${task.id}`);
          success = true;
        } catch (error) {
          retries++;
          console.error(`❌ Task failed (attempt ${retries}/${this.maxRetries}):`, error);
          
          if (retries >= this.maxRetries) {
            task.status = 'FAILED';
            task.error = error instanceof Error ? error.message : 'Unknown error';
            this.emit('task:failed', task);
            console.error(`🚨 Task permanently failed: ${task.id}`);
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }
      }

      this.queue.shift();
    }

    this.processing = false;
  }

  getTask(id: string): TradeTask | undefined {
    return this.queue.find(t => t.id === id);
  }

  getQueueStatus() {
    return {
      total: this.queue.length,
      queued: this.queue.filter(t => t.status === 'QUEUED').length,
      processing: this.queue.filter(t => t.status === 'PROCESSING').length,
      tasks: this.queue.slice(0, 10)
    };
  }

  clear() {
    this.queue = [];
    this.emit('queue:cleared');
  }
}

export const tradeQueue = new TradeQueue();
