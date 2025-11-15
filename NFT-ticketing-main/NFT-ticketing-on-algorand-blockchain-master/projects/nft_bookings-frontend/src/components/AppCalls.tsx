import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import React, { useState, useMemo } from 'react'
import { NftBookingsFactory } from '../contracts/NftBookings'
import {
  getAlgodConfigFromViteEnvironment,
  getIndexerConfigFromViteEnvironment
} from '../utils/network/getAlgoClientConfigs'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'
import { CONFIG } from '../config'

interface AppCallsProps {
  openModal: boolean
  setModalState: (value: boolean) => void
}

type ActionType = 'hello' | 'createEvent' | 'bookTicket' | 'getMyTickets'

const AppCalls = ({ openModal, setModalState }: AppCallsProps) => {
  const [loading, setLoading] = useState(false)
  const [contractInput, setContractInput] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventId, setEventId] = useState('')
  const [action, setAction] = useState<ActionType>('hello')

  const { enqueueSnackbar } = useSnackbar()
  const { transactionSigner, activeAddress } = useWallet()

  // --------------------------
  // Memoized Algorand client
  // --------------------------
  const algorand = useMemo(() => {
    if (!transactionSigner || !activeAddress) return null

    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    const client = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
    client.setDefaultSigner(transactionSigner)
    return client
  }, [transactionSigner, activeAddress])

  const algodClient = useMemo(() => {
    if (!transactionSigner || !activeAddress) return null
    const algodConfig = getAlgodConfigFromViteEnvironment()
    return new algosdk.Algodv2(
      algodConfig.token || '',
      algodConfig.server,
      algodConfig.port
    )
  }, [transactionSigner, activeAddress])

  const sendAppCall = async () => {
    if (!algorand || !activeAddress || !transactionSigner) {
      enqueueSnackbar('Please connect your wallet first', { variant: 'warning' })
      return
    }

    // Basic input validation
    if (action === 'createEvent' && (!eventName || !eventDate)) {
      enqueueSnackbar('Please provide event name and date', { variant: 'warning' })
      return
    }
    if (action === 'bookTicket' && !eventId) {
      enqueueSnackbar('Please provide an Event ID', { variant: 'warning' })
      return
    }

    setLoading(true)
    try {
      const factory = new NftBookingsFactory(algodClient, activeAddress, transactionSigner)
      const appClient = factory.getClient(CONFIG.APP_ID)

      let response
      switch (action) {
        case 'hello':
          response = await appClient.hello(contractInput)
          enqueueSnackbar(`Response: ${response.returnValue}`, { variant: 'success' })
          break

        case 'createEvent':
          response = await appClient.createEvent(eventName, eventDate)
          enqueueSnackbar(`Event created: ID ${response.returnValue}`, { variant: 'success' })
          setEventName('')
          setEventDate('')
          break

        case 'bookTicket':
          // Get ticket price and create payment transaction
          const priceResponse = await appClient.getTicketPrice()
          const ticketPrice = Number(priceResponse.returnValue)

          // Create payment transaction
          const suggestedParams = await algodClient.getTransactionParams().do()
          const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: algosdk.getApplicationAddress(CONFIG.APP_ID),
            amount: ticketPrice,
            suggestedParams,
          })

          response = await appClient.bookTicket(Number(eventId), paymentTxn)
          enqueueSnackbar(`Ticket booked: ID ${response.returnValue}`, { variant: 'success' })
          setEventId('')
          break

        case 'getMyTickets':
          response = await appClient.getMyTickets()
          const tickets = Array.isArray(response.returnValue)
            ? response.returnValue.join(', ')
            : response.returnValue
          enqueueSnackbar(`Your tickets: ${tickets}`, { variant: 'success' })
          break
      }
    } catch (e: any) {
      console.error('App call error:', e)
      enqueueSnackbar(`Error calling contract: ${e?.message || e}`, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // --------------------------
  // Disable send if inputs are invalid
  // --------------------------
  const isSendDisabled =
    loading ||
    !activeAddress ||
    (action === 'createEvent' && (!eventName || !eventDate)) ||
    (action === 'bookTicket' && !eventId)

  return (
    <dialog className={`modal ${openModal ? 'modal-open' : ''}`} open={openModal}>
      <form method="dialog" className="modal-box bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700" onSubmit={(e) => e.preventDefault()}>
        <h3 className="font-bold text-lg mb-4 text-white">Interact with NFT Bookings Contract</h3>

        <select
          className="select select-bordered w-full mb-4"
          value={action}
          onChange={(e) => setAction(e.target.value as ActionType)}
        >
          <option value="hello">Say Hello</option>
          <option value="createEvent">Create Event</option>
          <option value="bookTicket">Book Ticket</option>
          <option value="getMyTickets">Get My Tickets</option>
        </select>

        {action === 'hello' && (
          <input
            type="text"
            placeholder="Input for hello"
            className="input input-bordered w-full mb-2"
            value={contractInput}
            onChange={(e) => setContractInput(e.target.value)}
          />
        )}

        {action === 'createEvent' && (
          <>
            <input
              type="text"
              placeholder="Event Name"
              className="input input-bordered w-full mb-2"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
            <input
              type="date"
              className="input input-bordered w-full mb-2"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </>
        )}

        {action === 'bookTicket' && (
          <input
            type="number"
            placeholder="Event ID"
            className="input input-bordered w-full mb-2"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          />
        )}

        <div className="modal-action">
          <button type="button" className="btn" onClick={() => setModalState(false)}>Close</button>
          <button
            type="button"
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
            onClick={sendAppCall}
            disabled={isSendDisabled}
          >
            {loading ? 'Processing...' : 'Send'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default AppCalls
