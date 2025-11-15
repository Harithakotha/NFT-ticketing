import algosdk, { ABIResult, TransactionSigner, ABIMethod } from 'algosdk'

// Custom error types
export class ContractError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'ContractError'
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class WalletError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WalletError'
  }
}

/**
 * Real NftBookingsClient for interacting with Algorand smart contracts.
 */
export class NftBookingsClient {
  private methods: ABIMethod[]
  private transactionQueue: (() => Promise<any>)[] = []
  private isProcessingQueue = false

  constructor(
    private appId: number,
    private algod: algosdk.Algodv2,
    private defaultSender?: string,
    private signer?: TransactionSigner
  ) {
    this.methods = [
      new algosdk.ABIMethod({ name: 'hello', args: [{ type: 'string' }], returns: { type: 'string' } }),
      new algosdk.ABIMethod({ name: 'createEvent', args: [{ type: 'string' }, { type: 'string' }, { type: 'txn' }], returns: { type: 'uint64' } }),
      new algosdk.ABIMethod({ name: 'bookTicket', args: [{ type: 'uint64' }, { type: 'txn' }], returns: { type: 'uint64' } }),
      new algosdk.ABIMethod({ name: 'getMyTickets', args: [], returns: { type: 'uint64[]' } }),
      new algosdk.ABIMethod({ name: 'getTicketPrice', args: [], returns: { type: 'uint64' } }),
      new algosdk.ABIMethod({ name: 'getEvents', args: [], returns: { type: 'uint64[]' } }),
    ]
  }

  /** Retry logic with exponential backoff for read-only operations */
  private async retryWithBackoff<T>(operation: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
    let lastError: Error
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (err) {
        lastError = err as Error
        if (attempt === maxRetries || !this.isRetryableError(lastError)) break
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise((res) => setTimeout(res, delay))
      }
    }
    throw lastError!
  }

  /** Determines if an error is retryable */
  private isRetryableError(error: any): boolean {
    const msg = (error?.message || '').toLowerCase()
    return msg.includes('network') || msg.includes('timeout') || msg.includes('connection') || msg.includes('rate limit') ||
      ['ECONNRESET', 'ENOTFOUND'].includes(error?.code)
  }

  /** Queue for sequential state-changing transactions */
  private async enqueueTransaction<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.transactionQueue.push(() =>
        operation()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.transactionQueue.shift()
            this.processQueue()
          })
      )
      if (!this.isProcessingQueue) this.processQueue()
    })
  }

  private async processQueue() {
    if (this.transactionQueue.length === 0) {
      this.isProcessingQueue = false
      return
    }
    this.isProcessingQueue = true
    const currentOp = this.transactionQueue[0]
    await currentOp()
  }

  /** Execute smart contract method */
  private async executeMethod(methodName: string, args: any[] = [], isReadOnly = false): Promise<ABIResult> {
    const method = this.methods.find((m) => m.name === methodName)
    if (!method) throw new ContractError(`Method ${methodName} not found`)

    const operation = async () => {
      if (!isReadOnly && (!this.defaultSender || !this.signer)) throw new WalletError('Sender or signer missing')

      const atc = new algosdk.AtomicTransactionComposer()
      const suggestedParams = await this.algod.getTransactionParams().do()

      if (!isReadOnly) {
        atc.addMethodCall({
          appID: this.appId,
          method,
          methodArgs: args,
          sender: this.defaultSender!,
          suggestedParams,
          signer: this.signer!,
        })
        const result = await atc.execute(this.algod, 4)
        return result.methodResults[0]
      } else {
        // For read-only, simulate single call
        atc.addMethodCall({
          appID: this.appId,
          method,
          methodArgs: args,
          sender: this.defaultSender || algosdk.Address.zeroAddress(),
          suggestedParams,
          signer: this.signer!,
        })
        const result = await atc.execute(this.algod, 4)
        return result.methodResults[0]
      }
    }

    return isReadOnly ? this.retryWithBackoff(operation) : this.enqueueTransaction(operation)
  }

  // Public methods
  async hello(name: string) { return (await this.executeMethod('hello', [name], true)).returnValue as string }
  async createEvent(name: string, date: string, eventFee: number) {
    if (!this.defaultSender || !this.signer) throw new WalletError('Sender missing')
    const suggestedParams = await this.algod.getTransactionParams().do()
    const atc = new algosdk.AtomicTransactionComposer()
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: this.defaultSender,
      receiver: algosdk.getApplicationAddress(this.appId),
      amount: eventFee,
      suggestedParams,
    })
    atc.addTransaction({ txn: paymentTxn, signer: this.signer })
    const method = this.methods.find((m) => m.name === 'createEvent')!
    atc.addMethodCall({
      appID: this.appId,
      method,
      methodArgs: [name, date, paymentTxn] as any,
      sender: this.defaultSender,
      suggestedParams,
      signer: this.signer,
    })
    const result = await atc.execute(this.algod, 4)
    return Number(result.methodResults[0].returnValue)
  }
  async bookTicket(eventId: number, ticketPrice: number) {
    if (!this.defaultSender || !this.signer) throw new WalletError('Sender missing')
    const suggestedParams = await this.algod.getTransactionParams().do()
    const atc = new algosdk.AtomicTransactionComposer()
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: this.defaultSender,
      receiver: algosdk.getApplicationAddress(this.appId),
      amount: ticketPrice,
      suggestedParams,
    })
    atc.addTransaction({ txn: paymentTxn, signer: this.signer })
    const method = this.methods.find((m) => m.name === 'bookTicket')!
    atc.addMethodCall({
      appID: this.appId,
      method,
      methodArgs: [eventId, paymentTxn] as any,
      sender: this.defaultSender,
      suggestedParams,
      signer: this.signer,
    })
    const result = await atc.execute(this.algod, 4)
    return Number(result.methodResults[0].returnValue)
  }
  async getMyTickets() { return ((await this.executeMethod('getMyTickets', [], true)).returnValue as bigint[]).map(Number) }
  async getTicketPrice() { return Number((await this.executeMethod('getTicketPrice', [], true)).returnValue) }
  async getEvents() { return ((await this.executeMethod('getEvents', [], true)).returnValue as bigint[]).map(Number) }
}

/**
 * Mock client for development/testing
 */
export class MockNftBookingsClient {
  constructor(private appId: number) {}

  private async simulateDelay(min = 100, max = 500) { await new Promise(r => setTimeout(r, Math.random() * (max - min) + min)) }

  async hello(name: string): Promise<string> { await this.simulateDelay(); return `Hello, ${name}! (Mock)` }
  async createEvent(name: string, date: string, eventFee: number): Promise<number> {
    await this.simulateDelay(500, 1000)
    // No mock errors in development mode
    return Math.floor(Math.random() * 1_000_000)
  }
  async bookTicket(eventId: number, ticketPrice: number): Promise<number> {
    await this.simulateDelay(800, 1500)
    // No mock errors in development mode
    return Math.floor(Math.random() * 1_000_000)
  }
  async getMyTickets(): Promise<number[]> { await this.simulateDelay(); return [1001, 1002, 1003] }
  async getTicketPrice(): Promise<number> { await this.simulateDelay(); return 1_000_000 }
  async getEvents(): Promise<number[]> {
    await this.simulateDelay(200, 500)
    // No mock errors in development mode
    return [1, 2, 3, 4, 5]
  }
}

/**
 * Factory to provide real or mock client
 */
export class NftBookingsFactory {
  constructor(
    private algod: algosdk.Algodv2,
    private defaultSender?: string,
    private signer?: TransactionSigner,
    private isDevelopment = false
  ) {}

  getClient(appId: number) {
    return this.isDevelopment
      ? new MockNftBookingsClient(appId)
      : new NftBookingsClient(appId, this.algod, this.defaultSender, this.signer)
  }

  async deploy(): Promise<{ appClient: NftBookingsClient | MockNftBookingsClient; appId: number }> {
    const appId = this.isDevelopment ? 123_456 : 123_456 // TODO: replace with real deployment logic
    return { appClient: this.getClient(appId), appId }
  }
}
