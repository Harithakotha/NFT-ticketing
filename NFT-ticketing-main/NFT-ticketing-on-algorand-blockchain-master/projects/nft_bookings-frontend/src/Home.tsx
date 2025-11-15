// src/components/Home.tsx
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState, useEffect } from 'react'
import ConnectWallet from './components/ConnectWallet'
import EventList from './components/EventList'
import TicketList from './components/TicketList'
import BuyTicketModal from './components/BuyTicketModal'

const Home: React.FC = () => {
  const { activeAddress } = useWallet()
  const [openWalletModal, setOpenWalletModal] = useState(false)
  const [openBuyTicketModal, setOpenBuyTicketModal] = useState(false)
  const [activeView, setActiveView] = useState<'events' | 'tickets' | null>(null)
  const [typedText, setTypedText] = useState('')
  const fullText = 'NFT-based ticketing on Algorand — securely buy, manage, and verify your tickets.'

  const toggleWalletModal = () => setOpenWalletModal(prev => !prev)
  const toggleBuyTicketModal = () => setOpenBuyTicketModal(prev => !prev)
  const showEvents = () => setActiveView('events')
  const showTickets = () => setActiveView('tickets')

  useEffect(() => {
    let index = 0
    const timer = setInterval(() => {
      setTypedText(fullText.slice(0, index))
      index++
      if (index > fullText.length) clearInterval(timer)
    }, 50)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-start py-12 px-6 relative overflow-hidden">
      {/* Hero Section */}
      <div className="relative z-10 text-center mb-16 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-700/50">
        <h1 className="text-7xl font-extrabold text-white drop-shadow-2xl mb-4 animate-fadeIn bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          🎟️ AlgoTicket
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto animate-fadeIn delay-200 font-medium">
          {typedText}<span className="animate-pulse text-cyan-400">|</span>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-6 mb-12 relative z-10">
        <button
          className="btn bg-gradient-to-r from-slate-700 to-slate-600 text-white font-bold shadow-2xl hover:shadow-slate-500/50 hover:shadow-lg hover:scale-110 transform transition-all duration-500 rounded-full px-8 py-4 border-2 border-slate-500 hover:border-slate-400"
          onClick={toggleWalletModal}
        >
          {activeAddress ? '🔄 Switch Wallet' : '🔗 Connect Wallet'}
        </button>

        {activeAddress && (
          <>
            <button
              className="btn btn-outline text-slate-300 border-2 border-slate-500 hover:bg-slate-700 hover:text-white transition-all duration-500 rounded-full px-8 py-4 hover:shadow-lg hover:scale-110 transform hover:border-slate-400"
              onClick={showEvents}
            >
              📅 View Events
            </button>

            <button
              className="btn btn-outline text-slate-300 border-2 border-slate-500 hover:bg-slate-700 hover:text-white transition-all duration-500 rounded-full px-8 py-4 hover:shadow-lg hover:scale-110 transform hover:border-slate-400"
              onClick={showTickets}
            >
              🎫 My Tickets
            </button>

            {activeView === 'events' && (
              <button
                className="btn bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold shadow-2xl hover:shadow-cyan-400/50 hover:shadow-lg hover:scale-110 transform transition-all duration-500 rounded-full px-8 py-4 border-2 border-cyan-400 hover:border-purple-400"
                onClick={toggleBuyTicketModal}
              >
                🛒 Buy Ticket
              </button>
            )}
          </>
        )}
      </div>

      {/* Content Cards */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
        {activeView === 'events' && (
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-700/50">
            <EventList />
          </div>
        )}
        {activeView === 'tickets' && (
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-700/50">
            <TicketList />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-slate-400 relative z-10">
        <p className="text-sm">Powered by Algorand Blockchain © 2025 AlgoTicket</p>
      </footer>

      {/* Modals */}
      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
      <BuyTicketModal openModal={openBuyTicketModal} closeModal={toggleBuyTicketModal} />
    </div>
  )
}

export default Home
