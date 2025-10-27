import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { NftBookingsFactory } from '../contracts/NftBookings'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import algosdk from 'algosdk'
import { CONFIG } from '../config'

interface CreateEventModalProps {
  openModal: boolean
  closeModal: () => void
  onEventCreated?: () => void
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ openModal, closeModal, onEventCreated }) => {
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [loading, setLoading] = useState(false)
  const { enqueueSnackbar } = useSnackbar()
  const { transactionSigner, activeAddress } = useWallet()

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algodClient = new algosdk.Algodv2(
    algodConfig.token as string || '',
    algodConfig.server,
    algodConfig.port
  )

  const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms))

  const handleCreateEvent = async () => {
    if (!activeAddress || !transactionSigner) {
      enqueueSnackbar('Please connect your wallet first', { variant: 'warning' })
      return
    }

    if (!eventName || !eventDate) {
      enqueueSnackbar('Please provide event name and date', { variant: 'error' })
      return
    }



    setLoading(true)
    try {
      const factory = new NftBookingsFactory(
        algodClient,
        activeAddress,
        transactionSigner,
        CONFIG.IS_DEVELOPMENT
      )
      const appClient = factory.getClient(CONFIG.APP_ID)

      const suggestedParams = await algodClient.getTransactionParams().do()
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: "2ZTFJNDXPWDETGJQQN33HAATRHXZMBWESKO2AUFZUHERH2H3TG4XTNPL4Y",
        amount: 1000000, // 1 ALGO in microAlgos
        suggestedParams,
      })

      const response = await Promise.race([
        appClient.createEvent(eventName, eventDate, paymentTxn),
        timeout(5000)
      ])

      enqueueSnackbar(`Event created successfully with ID: ${response}`, { variant: 'success' })
      setEventName('')
      setEventDate('')
      closeModal()
      onEventCreated?.()
    } catch (e: any) {
      console.error('Error creating event:', e)
      enqueueSnackbar(`Error creating event: ${e instanceof Error ? e.message : 'Unknown error'}`, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog id="create_event_modal" className={`modal ${openModal ? 'modal-open' : ''} bg-slate-200`}>
      <form method="dialog" className="modal-box" onSubmit={(e) => e.preventDefault()}>
        <h3 className="font-bold text-lg">Create Event</h3>

        <input
          type="text"
          placeholder="Event Name"
          className="input input-bordered w-full mb-4"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
        />

        <input
          type="date"
          className="input input-bordered w-full mb-4"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">💰 Event Creation Fee: 1 ALGO</p>
          <p className="text-xs text-blue-600 mt-1">Payment is required to create an event and generate an Event ID</p>
        </div>

        <div className="modal-action">
          <button type="button" className="btn" onClick={closeModal}>Close</button>
          <button
            type="button"
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
            onClick={handleCreateEvent}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default CreateEventModal
