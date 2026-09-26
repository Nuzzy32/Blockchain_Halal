import { useCallback, useEffect, useState } from 'react'
import { NETWORK, addChainParams } from './chain.js'
import { errorMessage, isRevert, readRegistry, rolesOf, writeRegistry } from './registry.js'
import { parseId } from './validation.js'

export const hasMetaMask = () => typeof window.ethereum !== 'undefined'

/** Wallet MetaMask + peran yang dibaca dari contract (bukan dipilih sendiri: contract tetap akan menolak). */
export function useWallet() {
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [roles, setRoles] = useState(null)
  const [rolesError, setRolesError] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState(null)

  const loadRoles = useCallback(async (addr) => {
    setRoles(null)
    setRolesError(null)
    if (!addr) return
    try {
      setRoles(await rolesOf(addr))
    } catch (err) {
      setRolesError(errorMessage(err))
    }
  }, [])

  const load = useCallback(
    (addr) => {
      setAccount(addr)
      loadRoles(addr)
    },
    [loadRoles],
  )

  // Pulihkan koneksi yang sudah pernah diizinkan, tanpa memunculkan popup.
  useEffect(() => {
    if (!hasMetaMask()) return
    const eth = window.ethereum
    eth.request({ method: 'eth_accounts' }).then((a) => a[0] && load(a[0]))
    eth.request({ method: 'eth_chainId' }).then((c) => setChainId(BigInt(c)))
    const onAccounts = (a) => load(a[0] ?? null)
    const onChain = (c) => setChainId(BigInt(c))
    eth.on('accountsChanged', onAccounts)
    eth.on('chainChanged', onChain)
    return () => {
      eth.removeListener('accountsChanged', onAccounts)
      eth.removeListener('chainChanged', onChain)
    }
  }, [load])

  const connect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setChainId(BigInt(await window.ethereum.request({ method: 'eth_chainId' })))
      load(addr)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setConnecting(false)
    }
  }

  const switchNetwork = async () => {
    setSwitching(true)
    setError(null)
    const params = addChainParams()
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: params.chainId }] })
    } catch (err) {
      // 4902 = jaringan belum terdaftar di MetaMask, jadi tambahkan dulu.
      if (err?.code === 4902 || err?.data?.originalError?.code === 4902) {
        try {
          await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [params] })
        } catch (addErr) {
          setError(errorMessage(addErr))
        }
      } else {
        setError(errorMessage(err))
      }
    } finally {
      setSwitching(false)
    }
  }

  return {
    account,
    roles,
    rolesError,
    connecting,
    switching,
    error,
    wrongNetwork: chainId !== null && chainId !== NETWORK.chainId,
    connect,
    switchNetwork,
    refreshRoles: () => loadRoles(account),
  }
}

/** Satu transaksi: menunggu tanda tangan -> menunggu blok -> berhasil / gagal. */
export function useTx() {
  const [state, setState] = useState({ status: 'idle' })

  const run = async (send) => {
    setState({ status: 'signing' })
    try {
      const sent = await send(await writeRegistry())
      setState({ status: 'mining', hash: sent.hash })
      const receipt = await sent.wait()
      setState({ status: 'success', hash: sent.hash })
      return receipt
    } catch (err) {
      setState({ status: 'error', message: errorMessage(err) })
      return null
    }
  }

  return {
    state,
    busy: state.status === 'signing' || state.status === 'mining',
    run,
    reset: () => setState({ status: 'idle' }),
  }
}

/** Data sapi untuk pratinjau form. `idText` mentah dari input; tidak valid -> idle. */
export function useCattle(idText) {
  const cattleId = parseId(idText)
  const [state, setState] = useState({ status: 'idle' })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!cattleId) return setState({ status: 'idle' })
    let cancelled = false
    setState({ status: 'loading' })
    readRegistry()
      .getCattle(cattleId)
      .then((cattle) => !cancelled && setState({ status: 'ok', cattle }))
      .catch((err) => {
        if (cancelled) return
        setState(isRevert(err, 'CattleNotFound') ? { status: 'notfound' } : { status: 'error', message: errorMessage(err) })
      })
    return () => {
      cancelled = true
    }
  }, [cattleId, nonce])

  return { ...state, cattleId, reload: () => setNonce((n) => n + 1) }
}
