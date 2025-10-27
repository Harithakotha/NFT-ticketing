import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { NftBookingsFactory } from '../contracts/NftBookings'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'
import { CONFIG } from '../config'

interface Ticket {
  id: number
  eventName?: string
  date?: string
}

const TicketList: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)

  const { enqueueSnackbar } = useSnackbar()
  const { transactionSigner, activeAddress } = useWallet()

  const algorand = useMemo(() => {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    const client = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
    if (transactionSigner) client.setDefaultSigner(transactionSigner)
    return client
  }, [transactionSigner])

  const algodClient = useMemo(() => {
    const cfg = getAlgodConfigFromViteEnvironment()
    return new algosdk.Algodv2(cfg.token || '', cfg.server, cfg.port)
  }, [])

  const appFactory = useMemo(() => {
    if (!activeAddress || !transactionSigner) return null
    return new NftBookingsFactory(algodClient, activeAddress, transactionSigner, CONFIG.IS_DEVELOPMENT)
  }, [activeAddress, transactionSigner, algodClient])

  const getAppClient = useCallback(() => {
    if (!appFactory) throw new Error('Wallet not connected or factory not initialized')
    return appFactory.getClient(CONFIG.APP_ID)
  }, [appFactory])

  const fetchTickets = useCallback(async () => {
    if (!activeAddress || !transactionSigner) return
    setLoading(true)

    try {
      let fetchedTickets: Ticket[] = []

      if (CONFIG.IS_DEVELOPMENT) {
        const appClient = getAppClient()
        const ticketIds = await appClient.getMyTickets()

        const mockEvents = [
          { name: "Summer Music Festival", date: "2024-07-15" },
          { name: "Tech Conference 2024", date: "2024-08-20" },
          { name: "Art Exhibition", date: "2024-09-10" },
          { name: "Sports Championship", date: "2024-10-05" },
          { name: "Comedy Show", date: "2024-11-12" }
        ]

        // Deduplicate and assign events
        const uniqueIds = Array.from(new Set(ticketIds))
        fetchedTickets = uniqueIds.map((id, idx) => ({
          id,
          eventName: mockEvents[idx % mockEvents.length].name,
          date: mockEvents[idx % mockEvents.length].date
        }))
      } else {
        const indexerCfg = getIndexerConfigFromViteEnvironment()
        const indexerClient = new algosdk.Indexer(indexerCfg.token || '', indexerCfg.server, indexerCfg.port)
        const accountInfo = await indexerClient.lookupAccountAssets(activeAddress).do()

        const ticketAssets = (accountInfo.assets || []).filter((asset: any) => {
          const unitName = asset.asset?.params?.unitName || ''
          return asset.amount === 1 && unitName.includes('TICKET')
        })

        // Deduplicate by asset id
        const uniqueAssets = Array.from(new Map(ticketAssets.map((a: any) => [a.asset.index, a])).values())
        fetchedTickets = uniqueAssets.map((asset: any) => ({
          id: asset.asset.index,
          eventName: asset.asset.params.name || 'Unknown Event',
          date: 'TBA'
        }))
      }

      setTickets(fetchedTickets)
    } catch (err: any) {
      console.error('Error fetching tickets:', err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      enqueueSnackbar(`Error fetching tickets: ${message}`, { variant: 'error' })
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [activeAddress, transactionSigner, getAppClient, enqueueSnackbar])

  useEffect(() => {
    fetchTickets()

    // Listen for ticket refresh events
    const handleRefreshTickets = () => {
      fetchTickets()
    }

    window.addEventListener('refreshTickets', handleRefreshTickets)

    return () => {
      window.removeEventListener('refreshTickets', handleRefreshTickets)
    }
  }, [fetchTickets])

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">My Tickets</h2>

      <div className="flex justify-center mb-6">
        <button
          className="btn btn-secondary"
          onClick={fetchTickets}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Tickets'}
        </button>
      </div>

      {tickets.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="card bg-white shadow-lg rounded-lg border border-gray-200 hover:shadow-xl transition-shadow"
            >
              <div className="card-body p-4">
                <h3 className="card-title text-xl font-semibold mb-2">Ticket ID: {ticket.id}</h3>
                <p className="text-gray-600">Event: {ticket.eventName}</p>
                <p className="text-gray-600">Date: {ticket.date}</p>
                <p className="mt-2 text-sm text-gray-500">This is your verified NFT ticket on Algorand.</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading && <p className="text-center text-gray-500 mt-6">No tickets found. Buy one from events!</p>
      )}
    </div>
  )
}

export default TicketList
