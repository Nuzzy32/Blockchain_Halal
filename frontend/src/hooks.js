import { useCallback, useEffect, useRef, useState } from 'react'
import { NETWORK, addChainParams } from './chain.js'
import { compressPhoto, imageMime } from './photo.js'
import {
  cattlePhoto, errorMessage, isRevert, listCattle, listPackages, readRegistry, rolesOf, setDemoAccount, writeRegistry,
} from './registry.js'
import { parseId } from './validation.js'

// Disiarkan setiap transaksi berhasil, supaya daftar pilihan di semua form ikut diperbarui.
const CHANGED = 'registry:changed'

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
  const [demo, setDemo] = useState(false)
  // Selama mode demo, event akun MetaMask diabaikan supaya tidak menimpa akun demo.
  const demoRef = useRef(false)

  // Alamat yang terakhir diminta: hasil rolesOf untuk permintaan yang sudah usang (mis. alamat
  // berganti dua kali cepat berturut-turut) diabaikan supaya tidak menimpa hasil yang lebih baru.
  const latestAddr = useRef(null)

  const loadRoles = useCallback(async (addr) => {
    latestAddr.current = addr
    setRoles(null)
    setRolesError(null)
    if (!addr) return
    try {
      const roles = await rolesOf(addr)
      if (latestAddr.current === addr) setRoles(roles)
    } catch (err) {
      if (latestAddr.current === addr) setRolesError(errorMessage(err))
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
    eth.request({ method: 'eth_accounts' }).then((a) => a[0] && !demoRef.current && load(a[0])).catch(() => {})
    eth.request({ method: 'eth_chainId' }).then((c) => setChainId(BigInt(c))).catch(() => {})
    const onAccounts = (a) => !demoRef.current && load(a[0] ?? null)
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

  const demoLogin = (addr) => {
    demoRef.current = true
    setDemoAccount(addr)
    setDemo(true)
    setError(null)
    load(addr)
  }

  const demoLogout = () => {
    demoRef.current = false
    setDemoAccount(null)
    setDemo(false)
    load(null)
  }

  return {
    account,
    demo,
    demoLogin,
    demoLogout,
    roles,
    rolesError,
    connecting,
    switching,
    error,
    wrongNetwork: !demo && chainId !== null && chainId !== NETWORK.chainId,
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
      window.dispatchEvent(new Event(CHANGED))
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

/** Foto sapi dari blockchain (lihat cattlePhoto): { status: 'idle' | 'loading' | 'ok' | 'none' | 'failed', bytes }. */
export function useCattlePhoto(cattle, anteMortem = false) {
  const [state, setState] = useState({ status: 'idle' })
  useEffect(() => {
    if (!cattle) return setState({ status: 'idle' })
    let cancelled = false
    setState({ status: 'loading' })
    cattlePhoto(cattle, anteMortem)
      .then((bytes) => !cancelled && setState(bytes ? { status: 'ok', bytes } : { status: 'none' }))
      .catch(() => !cancelled && setState({ status: 'failed' }))
    return () => {
      cancelled = true
    }
  }, [cattle, anteMortem])
  return state
}

const NO_PHOTO = { bytes: null, error: null, busy: false }

/** Foto dari <input type="file">, dikecilkan lewat compressPhoto: { photo, pick, clear }. */
export function usePhotoPicker() {
  const [photo, setPhoto] = useState(NO_PHOTO)
  const pick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return setPhoto(NO_PHOTO)
    setPhoto({ ...NO_PHOTO, busy: true })
    try {
      setPhoto({ ...NO_PHOTO, bytes: await compressPhoto(file) })
    } catch (err) {
      setPhoto({ ...NO_PHOTO, error: err.message })
    }
  }
  return { photo, pick, clear: () => setPhoto(NO_PHOTO) }
}

/** Pesan validasi foto wajib, atau null kalau sudah siap dikirim. */
export const photoError = (photo, what) =>
  photo.error ?? (photo.busy ? 'Foto masih diproses…' : photo.bytes ? null : `${what} wajib diunggah.`)

/** Byte gambar -> object URL untuk <img>, dilepas otomatis. Bukan WebP/JPEG/PNG -> null. */
export function usePhotoUrl(bytes) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    const type = imageMime(bytes)
    if (!type) return setUrl(null)
    const u = URL.createObjectURL(new Blob([bytes], { type }))
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [bytes])
  return url
}

/** Daftar dari contract yang dibaca ulang setiap ada transaksi berhasil di form mana pun. */
function useList(load) {
  const [state, setState] = useState({ status: 'loading', items: [] })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const bump = () => setNonce((n) => n + 1)
    window.addEventListener(CHANGED, bump)
    return () => window.removeEventListener(CHANGED, bump)
  }, [])

  useEffect(() => {
    let cancelled = false
    load()
      .then((items) => !cancelled && setState({ status: 'ok', items }))
      .catch((err) => !cancelled && setState({ status: 'error', items: [], message: errorMessage(err) }))
    return () => {
      cancelled = true
    }
  }, [load, nonce])

  return state
}

export const useCattleList = () => useList(listCattle)
export const usePackageList = () => useList(listPackages)
