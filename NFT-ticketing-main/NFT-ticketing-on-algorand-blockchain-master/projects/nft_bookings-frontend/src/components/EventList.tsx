import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { NftBookingsFactory } from '../contracts/NftBookings'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'
import CreateEventModal from './CreateEventModal'
import { CONFIG } from '../config'

const APP_ID = CONFIG.APP_ID

interface Event {
  id: number
  name: string
  date: string
  price?: number
}

const EventList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { enqueueSnackbar } = useSnackbar()
  const { transactionSigner, activeAddress } = useWallet()

  /** Algorand clients */
  const algodClient = useMemo(() => {
    const cfg = getAlgodConfigFromViteEnvironment()
    return new algosdk.Algodv2(cfg.token || '', cfg.server, cfg.port)
  }, [])

  const indexerClient = useMemo(() => {
    const cfg = getIndexerConfigFromViteEnvironment()
    return new algosdk.Indexer(cfg.token || '', cfg.server, cfg.port)
  }, [])

  const algorand = useMemo(() => {
    const client = AlgorandClient.fromConfig({
      algodConfig: getAlgodConfigFromViteEnvironment(),
      indexerConfig: getIndexerConfigFromViteEnvironment(),
    })
    if (transactionSigner) client.setDefaultSigner(transactionSigner)
    return client
  }, [transactionSigner])

  const appFactory = useMemo(() => {
    if (!activeAddress || !transactionSigner) return null
    return new NftBookingsFactory(algodClient, activeAddress, transactionSigner, CONFIG.IS_DEVELOPMENT)
  }, [algodClient, activeAddress, transactionSigner])

  const getAppClient = useCallback(() => {
    if (!appFactory) throw new Error('Wallet not connected or factory not initialized')
    return appFactory.getClient(APP_ID)
  }, [appFactory])

  /** Helper to parse event metadata safely */
  const parseEventMetadata = useCallback(async (assetParams: any, eventId: number) => {
    let name = `Event ${eventId}`
    let date = 'Unknown date'

    try {
      if (assetParams.url?.startsWith('ipfs://')) {
        const metadata = await fetch(assetParams.url.replace('ipfs://', 'https://ipfs.io/ipfs/')).then(res => res.json())
        name = metadata.name || name
        date = metadata.date || date
      } else if (assetParams.unitName === 'EVENT') {
        const match = assetParams.name?.match(/Event: (.+) on (.+)/)
        if (match) {
          name = match[1]
          date = match[2]
        }
      }
    } catch (err) {
      console.warn(`Failed to parse metadata for event ${eventId}`, err)
    }

    return { id: eventId, name, date }
  }, [])

  /** Fetch all events */
  const fetchEvents = useCallback(async () => {
    if (!activeAddress || !transactionSigner) return

    try {
      const appClient = getAppClient()
      const eventIds = await appClient.getEvents()

      // Production: fetch event metadata
      const contractAddr = algosdk.getApplicationAddress(APP_ID)
      const { assets } = await indexerClient.lookupAccountAssets(contractAddr).do()

      const fetchedEvents = await Promise.all(
        eventIds.map(async id => {
          const asset = assets.find((a: any) => a.amount === 1 && a.assetId)
          if (!asset) return null
          const assetInfo = await indexerClient.lookupAssetByID(asset.assetId).do()
          return parseEventMetadata(assetInfo.asset.params, id)
        })
      )

      setEvents(fetchedEvents.filter((e): e is Event => e !== null))
    } catch (err: any) {
      console.error('Error fetching events:', err)
      enqueueSnackbar(`Error fetching events: ${err instanceof Error ? err.message : 'Unknown error'}`, { variant: 'error' })
      setEvents([])
    }
  }, [activeAddress, transactionSigner, getAppClient, indexerClient, enqueueSnackbar, parseEventMetadata])

  /** Book a ticket for an event */
  const bookTicket = useCallback(async (eventId: number) => {
    if (!activeAddress || !transactionSigner) {
      enqueueSnackbar('Wallet not connected', { variant: 'warning' })
      return
    }

    try {
      const appClient = getAppClient()
      const price = await appClient.getTicketPrice()
      const txId = await appClient.bookTicket(eventId, price)
      enqueueSnackbar(`Ticket booked! Tx ID: ${txId}`, { variant: 'success' })
    } catch (err: any) {
      console.error(err)
      enqueueSnackbar(`Error booking ticket: ${err instanceof Error ? err.message : 'Unknown error'}`, { variant: 'error' })
    }
  }, [activeAddress, transactionSigner, getAppClient, enqueueSnackbar])

  /** Handle new event created */
  const handleEventCreated = useCallback(() => {
    enqueueSnackbar('Event created successfully! Refreshing...', { variant: 'success' })
    fetchEvents()
  }, [fetchEvents, enqueueSnackbar])

  /** Auto-fetch when wallet changes */
  useEffect(() => {
    if (activeAddress && transactionSigner) fetchEvents()
  }, [activeAddress, transactionSigner, fetchEvents])

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Available Events</h2>
        <button className="btn btn-secondary" onClick={() => setShowCreateModal(true)}>
          Create Event
        </button>
      </div>

      <div className="grid gap-4">
        {events.map(event => (
          <div key={event.id} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">{event.name}</h3>
              <p>Date: {event.date}</p>
              <div className="card-actions justify-end">
                <button
                  className="btn btn-primary"
                  onClick={() => bookTicket(event.id)}
                >
                  Book Ticket
                </button>
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="text-center text-gray-500">No events available. Create one to get started!</p>}
      </div>

      <CreateEventModal openModal={showCreateModal} closeModal={() => setShowCreateModal(false)} onEventCreated={handleEventCreated} />
    </div>
  )
}

export default EventList
