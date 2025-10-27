// src/components/Home.tsx
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import EventList from './components/EventList'
import TicketList from './components/TicketList'
import BuyTicketModal from './components/BuyTicketModal'

const Home: React.FC = () => {
  const { activeAddress } = useWallet()
  const [openWalletModal, setOpenWalletModal] = useState(false)
  const [openBuyTicketModal, setOpenBuyTicketModal] = useState(false)
  const [activeView, setActiveView] = useState<'events' | 'tickets' | null>(null)

  const toggleWalletModal = () => setOpenWalletModal(prev => !prev)
  const toggleBuyTicketModal = () => setOpenBuyTicketModal(prev => !prev)
  const showEvents = () => setActiveView('events')
  const showTickets = () => setActiveView('tickets')

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-500 via-purple-400 to-pink-300 flex flex-col items-center justify-start py-12 px-6">

      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-6xl font-extrabold text-white drop-shadow-lg mb-3 animate-fadeIn">
          🎟️ AlgoTicket
        </h1>
        <p className="text-xl text-indigo-100 max-w-xl mx-auto animate-fadeIn delay-100">
          NFT-based ticketing on Algorand — securely buy, manage, and verify your tickets.
        </p>
      </header>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-4 mb-10">
        <button
          className="btn bg-white text-indigo-600 font-bold shadow-lg hover:scale-105 transform transition duration-300"
          onClick={toggleWalletModal}
        >
          {activeAddress ? 'Switch Wallet' : 'Connect Wallet'}
        </button>

        {activeAddress && (
          <>
            <button
              className={`btn btn-outline text-white border-white hover:bg-white hover:text-indigo-600 transition`}
              onClick={showEvents}
            >
              View Events
            </button>

            <button
              className={`btn btn-outline text-white border-white hover:bg-white hover:text-indigo-600 transition`}
              onClick={showTickets}
            >
              My Tickets
            </button>

            {activeView === 'events' && (
              <button
                className="btn bg-yellow-400 text-indigo-900 font-bold shadow-lg hover:scale-105 transform transition duration-300"
                onClick={toggleBuyTicketModal}
              >
                Buy Ticket
              </button>
            )}
          </>
        )}
      </div>

      {/* Content Cards */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {activeView === 'events' && <EventList />}
        {activeView === 'tickets' && <TicketList />}
      </div>

      {/* Modals */}
      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
      <BuyTicketModal openModal={openBuyTicketModal} closeModal={toggleBuyTicketModal} />
    </div>
  )
}

export default Home
