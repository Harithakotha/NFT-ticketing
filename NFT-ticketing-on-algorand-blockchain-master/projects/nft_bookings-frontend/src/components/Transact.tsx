import { algo, AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useState, useMemo } from 'react'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import algosdk from 'algosdk'

interface TransactProps {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const Transact = ({ openModal, setModalState }: TransactProps) => {
  const [loading, setLoading] = useState(false)
  const [receiverAddress, setReceiverAddress] = useState('')
  const [useManualSigner, setUseManualSigner] = useState(false)
  const [mnemonic, setMnemonic] = useState('')

  const { enqueueSnackbar } = useSnackbar()
  const { transactionSigner, activeAddress } = useWallet()

  // Memoized Algorand client
  const algorand = useMemo(() => {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    return AlgorandClient.fromConfig({ algodConfig })
  }, [])

  const isValidReceiver = receiverAddress.length === 58
  const isManualSignerValid = !useManualSigner || (mnemonic.trim().split(' ').length === 25)

  const handleSubmit = async () => {
    if (!isValidReceiver) {
      enqueueSnackbar('Invalid receiver address', { variant: 'warning' })
      return
    }
    if (!activeAddress && !useManualSigner) {
      enqueueSnackbar('Please connect your wallet first', { variant: 'warning' })
      return
    }
    if (!isManualSignerValid) {
      enqueueSnackbar('Mnemonic must have 25 words', { variant: 'warning' })
      return
    }

    let signer = transactionSigner
    let sender = activeAddress || ''

    if (useManualSigner) {
      try {
        const account = algosdk.mnemonicToSecretKey(mnemonic.trim())
        signer = algosdk.makeBasicAccountTransactionSigner(account)
        sender = account.addr
      } catch {
        enqueueSnackbar('Invalid mnemonic', { variant: 'error' })
        return
      }
    }

    setLoading(true)
    try {
      enqueueSnackbar('Sending transaction...', { variant: 'info' })
      const result = await algorand.send.payment({
        signer,
        sender,
        receiver: receiverAddress,
        amount: algo(1),
      })
      enqueueSnackbar(`Transaction sent: ${result.txIds[0]}`, { variant: 'success' })
      setReceiverAddress('')
      setMnemonic('')
      setModalState(false)
    } catch (e: any) {
      console.error('Transaction error', e)
      enqueueSnackbar(`Failed to send transaction: ${e?.message || e}`, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog className={`modal ${openModal ? 'modal-open' : ''}`} open={openModal}>
      <form method="dialog" className="modal-box" onSubmit={(e) => e.preventDefault()}>
        <h3 className="font-bold text-lg mb-4">Send Payment Transaction</h3>

        {/* Signer type */}
        <div className="form-control mb-4">
          <label className="label"><span className="label-text">Signer Type</span></label>
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="signer"
                checked={!useManualSigner}
                onChange={() => setUseManualSigner(false)}
                className="radio radio-primary"
              />
              <span className="ml-2">Wallet</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="signer"
                checked={useManualSigner}
                onChange={() => setUseManualSigner(true)}
                className="radio radio-primary"
              />
              <span className="ml-2">Manual (Mnemonic)</span>
            </label>
          </div>
        </div>

        {/* Manual mnemonic input */}
        {useManualSigner && (
          <div className="form-control mb-4">
            <label className="label"><span className="label-text">Mnemonic (25 words)</span></label>
            <textarea
              placeholder="Enter your 25-word mnemonic phrase"
              className="textarea textarea-bordered w-full"
              value={mnemonic}
              onChange={(e) => setMnemonic(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-red-500 mt-1">
              ⚠️ Using mnemonic in frontend is insecure. For demo only.
            </p>
          </div>
        )}

        {/* Receiver input */}
        <div className="form-control mb-4">
          <label className="label"><span className="label-text">Receiver Address</span></label>
          <input
            type="text"
            placeholder="Algorand address"
            className="input input-bordered w-full"
            value={receiverAddress}
            onChange={(e) => setReceiverAddress(e.target.value)}
          />
          {!isValidReceiver && receiverAddress.length > 0 && (
            <span className="text-xs text-red-500 mt-1">Address must be 58 characters long</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="modal-action flex justify-end gap-2">
          <button type="button" className="btn" onClick={() => setModalState(false)} disabled={loading}>
            Close
          </button>
          <button
            type="button"
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
            onClick={handleSubmit}
            disabled={loading || !isValidReceiver || !isManualSignerValid}
          >
            {loading ? 'Sending...' : 'Send 1 ALGO'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default Transact
