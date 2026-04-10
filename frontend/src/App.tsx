import './App.css'
import React, { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

type User = {
  id: string
  name: string
  email: string
  friendIds: string[]
  emailNotificationsEnabled: boolean
}

type Group = {
  id: string
  name: string
  ownerId: string
  memberIds: string[]
}

type ExpenseType = 'PERSONAL' | 'GROUP'

type Expense = {
  id: string
  description: string
  amount: number
  currency: string
  payerId: string
  participantIds: string[]
  groupId?: string
  type: ExpenseType
  createdAt?: string
  createdBy?: string
  imageUrl?: string
  customSplits?: Record<string, number>
  isRecurring?: boolean
  recurring?: boolean
  recurrenceStartDate?: string
  recurrenceType?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM'
  recurrenceInterval?: number
  recurrenceEndDate?: string
  generatedFromRecurringId?: string
  recurrenceOccurrenceDate?: string
}

type Activity = {
  id: string
  description: string
  createdAt: string
}

type PendingInvitation = {
  id: string
  inviterUserId: string
  inviteeEmail: string
  inviteeName: string
  inviteeUserId?: string
  type: 'FRIEND' | 'GROUP'
  groupId?: string
  groupName?: string
  createdAt: string
}

type AuthResponse = {
  user: User
  token: string
}

function getCurrencySymbol(currency: string) {
  switch (currency) {
    case 'USD': return '$'
    case 'EUR': return '€'
    case 'GBP': return '£'
    case 'JPY': return '¥'
    case 'INR': return '₹'
    default: return currency
  }
}

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    localStorage.getItem('theme') === 'light' ? 'light' : 'dark',
  )
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [personalExpenses, setPersonalExpenses] = useState<Expense[]>([])
  const [groupExpenses, setGroupExpenses] = useState<Expense[]>([])
  const [allGroupExpenses, setAllGroupExpenses] = useState<Expense[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityPage, setActivityPage] = useState(0)
  const [activityHasMore, setActivityHasMore] = useState(true)

  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('authToken'))

  const [currentUserId, setCurrentUserId] = useState<string>(() => localStorage.getItem('currentUserId') || '')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')

  const [friendNameToAdd, setFriendNameToAdd] = useState('')
  const [friendEmailToAdd, setFriendEmailToAdd] = useState('')
  const [friendAddError, setFriendAddError] = useState('')
  const [friendAddSuccess, setFriendAddSuccess] = useState('')


  const [groupName, setGroupName] = useState('')
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([])

  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCurrency, setExpenseCurrency] = useState('INR')
  const [isGroupExpense, setIsGroupExpense] = useState(false)
  const [isFriendExpense, setIsFriendExpense] = useState(false)
  const [selectedFriendId, setSelectedFriendId] = useState('')
  const [expenseImageUrl, setExpenseImageUrl] = useState('')
  const [expensePayerId, setExpensePayerId] = useState('')
  const [splitMode, setSplitMode] = useState<'equal' | 'unequal' | 'percentage'>('equal')
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({}) 
  const [isRecurringExpense, setIsRecurringExpense] = useState(false)
  const [recurrenceStartDate, setRecurrenceStartDate] = useState('')
  const [recurrenceType, setRecurrenceType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM'>('MONTHLY')
  const [recurrenceInterval, setRecurrenceInterval] = useState('1')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [settledExpenses, setSettledExpenses] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('settledExpenses')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch { return new Set() }
  })

  const [activeTab, setActiveTab] = useState<'groups' | 'expenses' | 'friends' | 'activity' | 'account'>('groups')

  const [groupDetailView, setGroupDetailView] = useState<string | null>(null)

  const [groupSearch, setGroupSearch] = useState('')
  const [friendSearch, setFriendSearch] = useState('')
  const [activitySearch, setActivitySearch] = useState('')

  const [showExpenseModal, setShowExpenseModal] = useState(false)

  const [editingFriend, setEditingFriend] = useState<User | null>(null)
  const [editFriendName, setEditFriendName] = useState('')
  const [editFriendEmail, setEditFriendEmail] = useState('')

  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupMemberIds, setEditGroupMemberIds] = useState<string[]>([])

  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [signupError, setSignupError] = useState('')
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [groupInvitations, setGroupInvitations] = useState<PendingInvitation[]>([])
  const [friendInvitations, setFriendInvitations] = useState<PendingInvitation[]>([])

  const isAuthenticated = !!authToken

  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const authedFetch = React.useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers || {})
    if (authToken) {
      headers.set('Authorization', `Bearer ${authToken}`)
    }
    headers.set('Content-Type', headers.get('Content-Type') || 'application/json')
    const res = await fetch(input, { ...init, headers })
    if (res.status === 401) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('currentUserId')
      setAuthToken(null)
      setCurrentUserId('')
    }
    return res
  }, [authToken])

  const fetchUsers = React.useCallback(async () => {
    try {
      const res = await authedFetch(`${API_BASE}/users`)
      if (!res.ok) return
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
      if (!currentUserId && data.length > 0) {
        setCurrentUserId(data[0].id)
      }
    } catch { /* ignore */ }
  }, [authedFetch, currentUserId])

  async function fetchGroups() {
    try {
      const uid = currentUserId
      const url = uid ? `${API_BASE}/groups?userId=${uid}` : `${API_BASE}/groups`
      const res = await authedFetch(url)
      if (!res.ok) return
      const data = await res.json()
      setGroups(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }

  async function fetchGroupInvitations() {
    if (!currentUserId || !authToken) return
    try {
      const res = await authedFetch(`${API_BASE}/groups/invitations/${currentUserId}`)
      if (res.ok) setGroupInvitations(await res.json())
    } catch { /* ignore */ }
  }

  async function fetchGroupExpenses(groupId: string) {
    try {
      const res = await authedFetch(`${API_BASE}/expenses/group/${groupId}`)
      if (!res.ok) return
      const data = await res.json()
      setGroupExpenses(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }

  async function fetchPersonalExpenses(userId: string) {
    try {
      const res = await authedFetch(`${API_BASE}/expenses/personal/${userId}`)
      if (!res.ok) return
      const data = await res.json()
      setPersonalExpenses(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }

  async function fetchAllGroupExpenses() {
    try {
      const res = await authedFetch(`${API_BASE}/groups?userId=${currentUserId}`)
      if (!res.ok) return
      const grps: Group[] = await res.json()
      const allExps: Expense[] = []
      for (const g of grps) {
        const r = await authedFetch(`${API_BASE}/expenses/group/${g.id}`)
        if (r.ok) {
          const data = await r.json()
          if (Array.isArray(data)) allExps.push(...data)
        }
      }
      setAllGroupExpenses(allExps)
    } catch { /* ignore */ }
  }

  async function fetchActivities(userId: string, page = 0, append = false) {
    try {
      const res = await authedFetch(`${API_BASE}/activities/${userId}?page=${page}&size=10`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) {
        if (append) {
          setActivities((prev) => [...prev, ...data])
        } else {
          setActivities(data)
        }
        setActivityHasMore(data.length === 10)
      } else {
        if (!append) setActivities([])
        setActivityHasMore(false)
      }
    } catch { /* ignore */ }
  }

  async function fetchPendingInvitations() {
    if (!currentUserId || !authToken) return
    try {
      const res = await authedFetch(`${API_BASE}/users/${currentUserId}/invitations`)
      if (res.ok) setPendingInvitations(await res.json())
    } catch { /* ignore */ }
  }

  async function fetchFriendInvitations() {
    if (!currentUserId || !authToken) return
    try {
      const res = await authedFetch(`${API_BASE}/users/${currentUserId}/friend-invitations`)
      if (res.ok) setFriendInvitations(await res.json())
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (authToken) {
      const load = async () => { await fetchUsers() }
      load()
    }
  }, [authToken, fetchUsers])

  useEffect(() => {
    if (authToken && currentUserId) {
      (async () => {
        await fetchPersonalExpenses(currentUserId)
        setActivityPage(0)
        await fetchActivities(currentUserId, 0, false)
        await fetchGroups()
        await fetchPendingInvitations()
        await fetchGroupInvitations()
        await fetchFriendInvitations()
        await fetchAllGroupExpenses()
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, currentUserId])

  useEffect(() => {
    if (selectedGroupId) {
      (async () => {
        await fetchGroupExpenses(selectedGroupId)
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId])

  async function handleAcceptGroupInvitation(invitationId: string) {
    try {
      const res = await authedFetch(`${API_BASE}/groups/invitations/${invitationId}/accept`, { method: 'POST' })
      if (res.ok) {
        await fetchGroupInvitations()
        await fetchGroups()
        await fetchActivities(currentUserId)
      }
    } catch { /* ignore */ }
  }

  async function handleDeclineGroupInvitation(invitationId: string) {
    try {
      const res = await authedFetch(`${API_BASE}/groups/invitations/${invitationId}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchGroupInvitations()
      }
    } catch { /* ignore */ }
  }

  async function handleToggleEmailNotifications(user: User) {
    const res = await authedFetch(`${API_BASE}/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, emailNotificationsEnabled: !user.emailNotificationsEnabled }),
    })
    if (res.ok) {
      await fetchUsers()
    }
  }

  async function handleAcceptFriendInvitation(invitationId: string) {
    try {
      const res = await authedFetch(`${API_BASE}/users/friend-invitations/${invitationId}/accept`, { method: 'POST' })
      if (res.ok) {
        await fetchFriendInvitations()
        await fetchUsers()
        await fetchActivities(currentUserId)
      }
    } catch { /* ignore */ }
  }

  async function handleDeclineFriendInvitation(invitationId: string) {
    try {
      const res = await authedFetch(`${API_BASE}/users/friend-invitations/${invitationId}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchFriendInvitations()
      }
    } catch { /* ignore */ }
  }

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId || !friendEmailToAdd.trim()) return
    setFriendAddError('')
    setFriendAddSuccess('')
    try {
      const res = await authedFetch(`${API_BASE}/users/${currentUserId}/friends/add-by-email`, {
        method: 'POST',
        body: JSON.stringify({
          email: friendEmailToAdd.trim(),
          name: friendNameToAdd.trim() || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setFriendNameToAdd('')
        setFriendEmailToAdd('')
        setFriendAddSuccess(`Friend request sent to ${data.invitation.inviteeEmail}!`)
        await fetchPendingInvitations()
        setTimeout(() => setFriendAddSuccess(''), 4000)
      } else if (res.status === 409) {
        const err = await res.json().catch(() => null)
        setFriendAddError(err?.error || 'Cannot add this friend')
      } else {
        setFriendAddError('Failed to send friend request')
      }
    } catch {
      setFriendAddError('Could not reach server')
    }
  }

  function toggleGroupMember(userId: string) {
    setGroupMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  async function handleRemoveFriend(friendId: string) {
    if (!currentUserId) return
    try {
      await authedFetch(`${API_BASE}/users/${currentUserId}/friends/${friendId}`, { method: 'DELETE' })
      await fetchUsers()
    } catch { /* ignore */ }
  }

  function startEditFriend(friend: User) {
    setEditingFriend(friend)
    setEditFriendName(friend.name)
    setEditFriendEmail(friend.email)
  }

  async function handleUpdateFriend(e: React.FormEvent) {
    e.preventDefault()
    if (!editingFriend) return
    try {
      await authedFetch(`${API_BASE}/users/${editingFriend.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...editingFriend, name: editFriendName, email: editFriendEmail }),
      })
      setEditingFriend(null)
      await fetchUsers()
    } catch { /* ignore */ }
  }

  async function handleDeleteGroup(groupId: string) {
    try {
      await authedFetch(`${API_BASE}/groups/${groupId}`, { method: 'DELETE' })
      if (selectedGroupId === groupId) setSelectedGroupId('')
      await fetchGroups()
    } catch { /* ignore */ }
  }

  function startEditGroup(group: Group) {
    setEditingGroup(group)
    setEditGroupName(group.name)
    setEditGroupMemberIds([...group.memberIds])
  }

  function toggleEditGroupMember(userId: string) {
    setEditGroupMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  async function handleUpdateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!editingGroup) return
    try {
      const updatedMembers = Array.from(new Set([editingGroup.ownerId, ...editGroupMemberIds]))
      await authedFetch(`${API_BASE}/groups/${editingGroup.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...editingGroup, name: editGroupName, memberIds: updatedMembers }),
      })
      setEditingGroup(null)
      setEditGroupMemberIds([])
      await fetchGroups()
    } catch { /* ignore */ }
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId || !groupName) return
    const res = await authedFetch(`${API_BASE}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: groupName,
        ownerId: currentUserId,
        memberIds: Array.from(new Set([currentUserId, ...groupMemberIds])),
      }),
    })
    if (res.ok) {
      setGroupName('')
      setGroupMemberIds([])
      await fetchGroups()
      await fetchActivities(currentUserId)
      await fetchGroupInvitations()
    }
  }

  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId || !expenseDescription || !expenseAmount) return

    // Friend expense: auto-create a 2-person group named "You & Friend"
    let resolvedGroupId: string | undefined = isGroupExpense ? selectedGroupId : undefined
    if (isFriendExpense && selectedFriendId && !isGroupExpense) {
      const friend = users.find(u => u.id === selectedFriendId)
      const friendGroupName = `${currentUser?.name || 'You'} & ${friend?.name || 'Friend'}`
      // Check if such a group already exists
      let existingGroup = groups.find(g =>
        g.memberIds.length === 2 &&
        g.memberIds.includes(currentUserId) &&
        g.memberIds.includes(selectedFriendId)
      )
      
      if (!existingGroup) {
        const res = await authedFetch(`${API_BASE}/groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: friendGroupName,
            ownerId: currentUserId,
            memberIds: [currentUserId, selectedFriendId],
          }),
        })
        if (res.ok) {
          existingGroup = await res.json()
          await fetchGroups()
        } else {
          return
        }
      }
      resolvedGroupId = existingGroup!.id
    }

    const useGroup = isGroupExpense || isFriendExpense
    const payer = useGroup && expensePayerId ? expensePayerId : currentUserId
    const payload: Partial<Expense> & { [key: string]: unknown } = {
      description: expenseDescription,
      amount: parseFloat(expenseAmount),
      currency: expenseCurrency,
      payerId: payer,
      createdBy: editingExpense ? editingExpense.createdBy : currentUserId,
      participantIds: useGroup && resolvedGroupId
        ? (isFriendExpense && !isGroupExpense
          ? [currentUserId, selectedFriendId]
          : groups.find((g) => g.id === resolvedGroupId)?.memberIds ?? [currentUserId])
        : [currentUserId],
      groupId: resolvedGroupId,
      type: useGroup ? 'GROUP' : 'PERSONAL',
      imageUrl: expenseImageUrl || undefined,
      customSplits: splitMode === 'unequal'
    ? Object.fromEntries(Object.entries(customSplits).map(([k, v]) => [k, parseFloat(v) || 0]))
  : splitMode === 'percentage'
  ? Object.fromEntries(Object.entries(customSplits).map(([k, v]) => {
      const pct = parseFloat(v) || 0
      return [k, Math.round((pct / 100) * parseFloat(expenseAmount) * 100) / 100]
    }))
  : undefined,
      isRecurring: isRecurringExpense,
      recurrenceStartDate: isRecurringExpense && recurrenceStartDate
        ? new Date(`${recurrenceStartDate}T00:00:00.000Z`).toISOString()
        : undefined,
      recurrenceType: isRecurringExpense ? recurrenceType.toUpperCase() as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM" : undefined,
      recurrenceInterval: isRecurringExpense ? Math.max(1, parseInt(recurrenceInterval || '1', 10)) : undefined,
      recurrenceEndDate: isRecurringExpense && recurrenceEndDate
        ? new Date(`${recurrenceEndDate}T00:00:00.000Z`).toISOString()
        : undefined,
    }
    if (editingExpense) {
      payload.id = editingExpense.id
    }

    const method = editingExpense ? 'PUT' : 'POST'
    const url = editingExpense
      ? `${API_BASE}/expenses/${editingExpense.id}`
      : `${API_BASE}/expenses`

    const res = await authedFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setSplitMode('equal')   
      setCustomSplits({}) 
      setExpenseDescription('')
      setExpenseAmount('')
      setExpenseImageUrl('')
      setExpensePayerId('')
      setIsFriendExpense(false)
      setSelectedFriendId('')
      setExpenseCurrency('INR')
      setIsRecurringExpense(false)
      setRecurrenceStartDate('')
      setRecurrenceType('MONTHLY')
      setRecurrenceInterval('1')
      setRecurrenceEndDate('')
      setEditingExpense(null)
      await fetchPersonalExpenses(currentUserId)
      if (selectedGroupId) {
        await fetchGroupExpenses(selectedGroupId)
      }
      await fetchAllGroupExpenses()
      await fetchActivities(currentUserId)
    }
    
  }

  function startEditExpense(expense: Expense) {
    setEditingExpense(expense)
    setExpenseDescription(expense.description)
    setExpenseAmount(String(expense.amount))
    setIsGroupExpense(expense.type === 'GROUP')
    setSelectedGroupId(expense.groupId || '')
    setExpenseImageUrl(expense.imageUrl || '')
    setExpensePayerId(expense.payerId)
    setIsRecurringExpense(!!(expense.isRecurring || expense.recurring))
    setRecurrenceStartDate(
      expense.recurrenceStartDate ? new Date(expense.recurrenceStartDate).toISOString().slice(0, 10) : ''
    )
    setRecurrenceType(expense.recurrenceType || 'MONTHLY')
    setRecurrenceInterval(String(expense.recurrenceInterval || 1))
    setRecurrenceEndDate(
      expense.recurrenceEndDate ? new Date(expense.recurrenceEndDate).toISOString().slice(0, 10) : ''
    )
    if (expense.customSplits && Object.keys(expense.customSplits).length > 0) {
      const values = Object.values(expense.customSplits)
      const allEqual = values.length > 1 && values.every(v => v === values[0])
      if (allEqual) {
        setSplitMode('equal')
        setCustomSplits({})
      } else {
        setSplitMode('unequal')
        setCustomSplits(
          Object.fromEntries(
            Object.entries(expense.customSplits).map(([k, v]) => [k, String(v)])
          )
        )
      }
    } else {
      setSplitMode('equal')
      setCustomSplits({})
    }
  }

  async function handleDeleteExpense(expense: Expense) {
    await authedFetch(`${API_BASE}/expenses/${expense.id}`, { method: 'DELETE' })
    if (currentUserId) {
      await fetchPersonalExpenses(currentUserId)
      await fetchActivities(currentUserId)
    }
    if (expense.groupId) {
      await fetchGroupExpenses(expense.groupId)
    }
    await fetchAllGroupExpenses()
  }

  function equalShare(expense: Expense): number {
    const participants = expense.participantIds?.length || 1
    return Math.round((expense.amount / participants) * 100) / 100
  }

  function userShare(expense: Expense, userId: string = currentUserId): number {
    if (expense.customSplits && expense.customSplits[userId] != null) {
      return expense.customSplits[userId]
    }
    return equalShare(expense)
  }

  function othersOweTotal(expense: Expense): number {
    return expense.amount - userShare(expense, expense.payerId)
  }

  function shareLabel(expense: Expense): string {
    if (expense.customSplits) {
      const values = Object.values(expense.customSplits)
      if (values.length > 0) {
        const first = Number(values[0])
        const allEqual = values.every(v => Math.abs(Number(v) - first) < 0.01)
        if (!allEqual) return 'Custom split'
      }
    }
    return `Equal share: ${getCurrencySymbol(expense.currency)}${equalShare(expense).toFixed(2)} per person`
  }

  function remainingAmount(): number {
  const total = parseFloat(expenseAmount) || 0
  const assigned = Object.values(customSplits)
    .reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
  return Math.round((total - assigned) * 100) / 100
}
function remainingPercentage(): number {
  return 100 - Object.values(customSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0)
}
  function payerName(payerId: string): string {
    const u = users.find((u) => u.id === payerId)
    return u ? u.name : 'Unknown'
  }

  function owesBreakdown(expense: Expense) {
  return (expense.participantIds || [])
    .filter(pid => pid !== expense.payerId)
    .map(pid => {
      const owes = expense.customSplits?.[pid] ?? equalShare(expense)
      return { name: payerName(pid), owes, id: pid }
    })
}

  async function handleSettleUp(expenseId: string) {
    try {
      await authedFetch(`${API_BASE}/expenses/${expenseId}/settle?userId=${currentUserId}`, { method: 'POST' })
    } catch { /* ignore */ }
    setSettledExpenses((prev) => {
      const next = new Set(prev).add(expenseId)
      localStorage.setItem('settledExpenses', JSON.stringify([...next]))
      return next
    })
    await fetchActivities(currentUserId)
  }

  const currentUser = users.find((u) => u.id === currentUserId) || null

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase()),
  )
  const filteredActivities = activities.filter((a) =>
    a.description.toLowerCase().includes(activitySearch.toLowerCase()),
  )

  const currentFriends: User[] = currentUser
    ? currentUser.friendIds
        .map((fid) => users.find((u) => u.id === fid))
        .filter((u): u is User => !!u)
        .filter((u) => u.name.toLowerCase().includes(friendSearch.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))
    : []

  const recurringTemplates: Expense[] = [...personalExpenses, ...allGroupExpenses]
    .filter((e) => e.isRecurring || e.recurring)
    .filter((e, idx, arr) => arr.findIndex((x) => x.id === e.id) === idx)
    .sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return db - da
    })

  if (!isAuthenticated) {
    return (
      <div className={`app ${theme === 'light' ? 'light-mode' : ''}`}>
        <header className="app-header">
          <div className="header-left">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">🌙</button>
            <h1>Splitwise</h1>
          </div>
        </header>
        <div className="auth-layout">
          <div className="panel auth-panel">
            <h2>Sign up</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setSignupError('')
                try {
                  const res = await fetch(`${API_BASE}/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: signupName,
                      email: signupEmail,
                      password: signupPassword,
                    }),
                  })
                  if (res.ok) {
                    const data: AuthResponse = await res.json()
                    localStorage.setItem('authToken', data.token)
                    localStorage.setItem('currentUserId', data.user.id)
                    setAuthToken(data.token)
                    setSignupName('')
                    setSignupEmail('')
                    setSignupPassword('')
                    setUsers([data.user])
                    setCurrentUserId(data.user.id)
                  } else if (res.status === 409) {
                    setSignupError('User with this email already exists')
                  } else {
                    setSignupError('Signup failed')
                  }
                } catch {
                  setSignupError('Could not reach server')
                }
              }}
              className="form-vertical"
            >
              <input
                type="text"
                placeholder="Name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
              />
              {signupError && <p className="signup-error">{signupError}</p>}
              <button type="submit">Create account</button>
            </form>
          </div>
          <div className="panel auth-panel">
            <h2>Log in</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setLoginError('')
                try {
                  const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: loginEmail,
                      password: loginPassword,
                    }),
                  })
                  if (res.ok) {
                    const data: AuthResponse = await res.json()
                    localStorage.setItem('authToken', data.token)
                    localStorage.setItem('currentUserId', data.user.id)
                    setAuthToken(data.token)
                    setLoginEmail('')
                    setLoginPassword('')
                    setUsers([data.user])
                    setCurrentUserId(data.user.id)
                  } else if (res.status === 401) {
                    setLoginError('Invalid email or password')
                  } else {
                    setLoginError('Login failed')
                  }
                } catch {
                  setLoginError('Could not reach server')
                }
              }}
              className="form-vertical"
            >
              <input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
              {loginError && <p className="error-text">{loginError}</p>}
              <button type="submit">Log in</button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const sortedGroups = [...filteredGroups].sort((a, b) => a.name.localeCompare(b.name))



  // Handler for notifications button: fetch unsettled expenses for the current user
  // Notification modal state
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState('');

  async function handleShowNotifications() {
    if (!currentUserId) {
      setNotificationError('No user selected.');
      setShowNotifications(true);
      return;
    }
    setLoadingNotifications(true);
    setNotificationError('');
    try {
      const res = await authedFetch(`${API_BASE}/notifications/${currentUserId}`);
      if (res.ok) {
        const expenses = await res.json();
        setPendingExpenses(Array.isArray(expenses) ? expenses : []);
      } else {
        setNotificationError('Failed to fetch notifications.');
        setPendingExpenses([]);
      }
    } catch {
      setNotificationError('Could not reach server.');
      setPendingExpenses([]);
    } finally {
      setLoadingNotifications(false);
      setShowNotifications(true);
    }
  }

  return (
    <div className={`app ${theme === 'light' ? 'light-mode' : ''}`}>
      <header className="app-header">
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">🌙</button>
          <h1 style={{ margin: 0 }}>Splitwise</h1>
        </div>
        <div className="header-center">
          <nav className="tabs">
            {['groups', 'expenses', 'friends', 'activity', 'account'].map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? 'tab tab-active' : 'tab'}
                onClick={() => { setActiveTab(tab as typeof activeTab); setGroupDetailView(null) }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
          {['groups', 'friends', 'activity'].includes(activeTab) && !groupDetailView && (
            <input
              type="text"
              className="search-input"
              placeholder={`Search ${activeTab}`}
              value={
                activeTab === 'groups'
                  ? groupSearch
                  : activeTab === 'friends'
                  ? friendSearch
                  : activitySearch
              }
              onChange={(e) => {
                if (activeTab === 'groups') setGroupSearch(e.target.value)
                else if (activeTab === 'friends') setFriendSearch(e.target.value)
                else setActivitySearch(e.target.value)
              }}
            />
          )}
        </div>
        <div className="header-right">
          <button
            onClick={handleShowNotifications}
            style={{ marginRight: '0.5rem' }}
            aria-label="Notifications"
            title="Notifications"
          >
            🔔
          </button>
          <button onClick={() => { localStorage.removeItem('authToken'); localStorage.removeItem('currentUserId'); setAuthToken(null); setCurrentUserId('') }}>Log out</button>
        </div>
      </header>

      {/* Notification Modal */}
      {showNotifications && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#E6E6FA', color: '#6A0DAD', padding: 24, borderRadius: 8, minWidth: 320, maxWidth: 400, boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            <h2>Notifications</h2>
            {loadingNotifications ? (
              <div>Loading...</div>
            ) : notificationError ? (
              <div style={{ color: 'red' }}>{notificationError}</div>
            ) : pendingExpenses.length === 0 ? (
              <div>No unsettled expenses!</div>
            ) : (
              <ul style={{ maxHeight: 300, overflowY: 'auto', padding: 0, listStyle: 'none' }}>
                {pendingExpenses.map(e => (
                  <li key={e.id} style={{ marginBottom: 12, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                    <strong>{e.description}</strong><br />
                    Amount: ₹{e.amount} <br />
                    Type: {e.type}
                  </li>
                ))}
              </ul>
            )}
            <button style={{ marginTop: 16 }} onClick={() => setShowNotifications(false)}>Close</button>
          </div>
        </div>
      )}

      <div className="layout">
        <aside className="sidebar">
          {activeTab === 'account' && currentUser && (
            <section className="panel">
              <h2>Account</h2>
              <p>
                <strong>{currentUser.name}</strong>
                <br />
                <span className="muted">{currentUser.email}</span>
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={currentUser.emailNotificationsEnabled}
                  onChange={() => handleToggleEmailNotifications(currentUser)}
                />{' '}
                Email notifications enabled
              </label>
            </section>
          )}
        </aside>

        <main className="main">
          {/* ── Friends tab ── */}
          {activeTab === 'friends' && (
            <>
              <section className="panel">
                <h2>Add Friend</h2>
                <form onSubmit={handleAddFriend} className="form-inline-row">
                  <input
                    type="text"
                    placeholder="Friend's name"
                    value={friendNameToAdd}
                    onChange={(e) => setFriendNameToAdd(e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Friend's email (required)"
                    value={friendEmailToAdd}
                    onChange={(e) => setFriendEmailToAdd(e.target.value)}
                    required
                  />
                  <button type="submit">Send friend request</button>
                </form>
                {friendAddError && <p className="error-text" style={{ marginTop: '0.5rem' }}>{friendAddError}</p>}
                {friendAddSuccess && <p className="success-text" style={{ marginTop: '0.5rem' }}>{friendAddSuccess}</p>}
              </section>

              {/* ── Friend Invitations (received) ── */}
              {friendInvitations.length > 0 && (
                <section className="panel">
                  <h2>Friend Invitations</h2>
                  <ul className="card-list">
                    {friendInvitations.map((inv) => {
                      const inviterUser = users.find((u) => u.id === inv.inviterUserId)
                      return (
                        <li key={inv.id} className="card friend-card pending-invite">
                          <div className="card-header">
                            <div>
                              <strong>{inviterUser?.name || 'Someone'}</strong>
                              <span className="muted" style={{ marginLeft: '0.5rem' }}>
                                {inviterUser?.email || inv.inviteeEmail}
                              </span>
                              <span className="badge pending-badge" style={{ marginLeft: '0.5rem' }}>Pending</span>
                            </div>
                            <div className="card-actions">
                              <button className="accept-btn" onClick={() => handleAcceptFriendInvitation(inv.id)}>✓ Accept</button>
                              <button className="decline-btn" onClick={() => handleDeclineFriendInvitation(inv.id)}>✕ Decline</button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}

              {editingFriend && (
                <section className="panel">
                  <h2>Edit Friend</h2>
                  <form onSubmit={handleUpdateFriend} className="form-inline-row">
                    <input type="text" value={editFriendName} onChange={(e) => setEditFriendName(e.target.value)} required />
                    <input type="email" value={editFriendEmail} onChange={(e) => setEditFriendEmail(e.target.value)} required />
                    <button type="submit">Save</button>
                    <button type="button" onClick={() => setEditingFriend(null)}>Cancel</button>
                  </form>
                </section>
              )}

              <section className="panel">
                <h2>My Friends</h2>
                {currentFriends.length === 0 ? (
                  <p className="muted">No friends yet — add someone above!</p>
                ) : (
                  <ul className="card-list">
                    {currentFriends.map((f) => (
                      <li key={f.id} className="card friend-card">
                        <div className="card-header">
                          <div>
                            <strong>{f.name}</strong>
                            <span className="muted" style={{ marginLeft: '0.5rem' }}>{f.email}</span>
                          </div>
                          <div className="card-actions">
                            <button className="icon-btn" title="Edit" onClick={() => startEditFriend(f)}>✏️</button>
                            <button className="icon-btn danger" title="Remove" onClick={() => handleRemoveFriend(f.id)}>🗑️</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {pendingInvitations.filter(inv => inv.type === 'FRIEND').length > 0 && (
                <section className="panel">
                  <h2>Sent Friend Requests</h2>
                  <ul className="card-list">
                    {pendingInvitations.filter(inv => inv.type === 'FRIEND').map((inv) => (
                      <li key={inv.id} className="card friend-card pending-invite">
                        <div className="card-header">
                          <div>
                            <strong>{inv.inviteeName || inv.inviteeEmail}</strong>
                            {inv.inviteeName && (
                              <span className="muted" style={{ marginLeft: '0.5rem' }}>{inv.inviteeEmail}</span>
                            )}
                            <span className="badge pending-badge" style={{ marginLeft: '0.5rem' }}>Awaiting response</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="muted" style={{ marginTop: '0.5rem' }}>These people will see your friend request when they log in.</p>
                </section>
              )}
            </>
          )}

          {/* ── Groups tab ── */}
          {activeTab === 'groups' && !groupDetailView && (
            <>
              <section className="panel">
                <h2>Create Group</h2>
                <form onSubmit={handleCreateGroup} className="form-vertical">
                  <input
                    type="text"
                    placeholder="Group name (e.g. Vacation Varkala)"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                  />
                  <p className="muted" style={{ margin: '0.25rem 0' }}>Select friends to add:</p>
                  <div className="pill-list">
                    {currentFriends.length > 0 ? currentFriends.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className={groupMemberIds.includes(u.id) ? 'pill pill-selected' : 'pill'}
                        onClick={() => toggleGroupMember(u.id)}
                      >
                        {u.name}
                      </button>
                    )) : (
                      <span className="muted">Add friends first to include them in groups</span>
                    )}
                  </div>
                  <button type="submit">Create group</button>
                </form>
              </section>

              {editingGroup && (
                <section className="panel">
                  <h2>Edit Group — {editingGroup.name}</h2>
                  <form onSubmit={handleUpdateGroup} className="form-vertical">
                    <label className="field-label">Group name</label>
                    <input type="text" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} required />

                    <label className="field-label" style={{ marginTop: '0.75rem' }}>Members</label>
                    <div className="member-list">
                      {editGroupMemberIds.map((mid) => {
                        const member = users.find((u) => u.id === mid)
                        if (!member) return null
                        const isOwner = mid === editingGroup.ownerId
                        return (
                          <div key={mid} className="member-row">
                            <span>{member.name} <span className="muted">({member.email})</span></span>
                            {isOwner ? (
                              <span className="badge">Owner</span>
                            ) : (
                              <button type="button" className="icon-btn danger" title="Remove member" onClick={() => toggleEditGroupMember(mid)}>🗑️</button>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <label className="field-label" style={{ marginTop: '0.75rem' }}>Add friends to group</label>
                    <div className="pill-list">
                      {currentFriends
                        .filter((f) => !editGroupMemberIds.includes(f.id))
                        .map((f) => (
                          <button key={f.id} type="button" className="pill" onClick={() => toggleEditGroupMember(f.id)}>
                            + {f.name}
                          </button>
                        ))}
                      {currentFriends.filter((f) => !editGroupMemberIds.includes(f.id)).length === 0 && (
                        <span className="muted">All friends already in group</span>
                      )}
                    </div>

                    <div className="form-inline-row" style={{ marginTop: '0.75rem' }}>
                      <button type="submit">Save changes</button>
                      <button type="button" onClick={() => { setEditingGroup(null); setEditGroupMemberIds([]) }}>Cancel</button>
                    </div>
                  </form>
                </section>
              )}

              {/* ── Group Invitations ── */}
              {groupInvitations.length > 0 && (
                <section className="panel">
                  <h2>Group Invitations</h2>
                  <ul className="card-list">
                    {groupInvitations.map((inv) => {
                      const inviterUser = users.find((u) => u.id === inv.inviterUserId)
                      return (
                        <li key={inv.id} className="card group-card pending-invite">
                          <div className="card-header">
                            <div>
                              <strong>{inv.groupName || 'Unknown group'}</strong>
                              <span className="muted" style={{ marginLeft: '0.5rem' }}>
                                invited by {inviterUser?.name || 'someone'}
                              </span>
                            </div>
                            <div className="card-actions">
                              <button className="accept-btn" title="Accept" onClick={() => handleAcceptGroupInvitation(inv.id)}>✓ Accept</button>
                              <button className="decline-btn" title="Decline" onClick={() => handleDeclineGroupInvitation(inv.id)}>✕ Decline</button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}

              <section className="panel">
                <h2>My Groups</h2>
                {sortedGroups.length === 0 ? (
                  <p className="muted">No groups yet — create one above!</p>
                ) : (
                  <ul className="card-list">
                    {sortedGroups.map((g) => (
                      <li key={g.id} className="card group-card">
                        <div className="card-header">
                          <button
                            type="button"
                            className="group-name-btn"
                            onClick={() => { setSelectedGroupId(g.id); setGroupDetailView(g.id); fetchGroupExpenses(g.id) }}
                          >
                            {g.name}
                          </button>
                          <div className="card-actions">
                            <button className="icon-btn" title="Edit" onClick={() => startEditGroup(g)}>✏️</button>
                            <button className="icon-btn danger" title="Delete" onClick={() => handleDeleteGroup(g.id)}>🗑️</button>
                          </div>
                        </div>
                        <div className="card-body">
                          <span className="muted">
                            {g.memberIds.length} member{g.memberIds.length !== 1 ? 's' : ''}:
                            {' '}
                            {g.memberIds.map((mid) => users.find((u) => u.id === mid)?.name || mid).join(', ')}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}

          {/* ── Group Detail View (separate page) ── */}
          {activeTab === 'groups' && groupDetailView && (() => {
            const grp = groups.find(g => g.id === groupDetailView)
            const sorted = [...groupExpenses].sort((a, b) => {
              const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
              const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
              return db - da
            })
            return (
              <section className="panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button className="icon-btn" onClick={() => setGroupDetailView(null)}>← Back</button>
                  <h2 style={{ margin: 0 }}>{grp?.name || 'Group'} — Expenses</h2>
                </div>
                <ul className="card-list">
                  {sorted.map((e) => (
                    <li key={e.id} className="card">
                      <div className="card-header">
                        <strong>{e.description}</strong>
                        <div style={{ textAlign: 'right' }}>
                          <span>{getCurrencySymbol(e.currency)}{e.amount.toFixed(2)} ({e.currency})</span>
                          {e.createdAt && <div className="muted" style={{ fontSize: '.75rem' }}>{new Date(e.createdAt).toLocaleString()}</div>}
                        </div>
                      </div>
                      <div className="card-body">
                        <div className="paid-by">Paid by <strong>{payerName(e.payerId)}</strong></div>
                        <div>{shareLabel(e)}{!e.customSplits && ` (${(e.participantIds || []).length} participants)`}</div>

                        {owesBreakdown(e).length > 0 && (
                          <div className="breakdown-list" style={{ margin: '6px 0', padding: '4px 0', borderTop: '1px solid #333' }}>
                            <strong style={{ fontSize: '.85rem' }}>Who owes what:</strong>
                            {owesBreakdown(e).map((entry) => (
                              <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', padding: '2px 0' }}>
                                <span>{entry.id === currentUserId ? 'You' : entry.name}</span>
                                <span>{getCurrencySymbol(e.currency)}{entry.owes.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Non-payer: you owe */}
                        {e.payerId !== currentUserId && (e.participantIds || []).includes(currentUserId) && (
                          settledExpenses.has(e.id) ? (
                            <div className="settled-text">✓ Settled up</div>
                          ) : (
                            <div className="owes-row">
                              <span className="owes-amount">You owe <strong>{getCurrencySymbol(e.currency)}{userShare(e).toFixed(2)}</strong> to {payerName(e.payerId)}</span>
                              <button className="settle-btn" onClick={() => handleSettleUp(e.id)}>Settle up</button>
                            </div>
                          )
                        )}

                        {/* Payer: others owe you */}
                        {e.payerId === currentUserId && (e.participantIds || []).length > 1 && (
                          settledExpenses.has(e.id) ? (
                            <div className="settled-text">✓ All settled</div>
                          ) : (
                            <div className="owes-row">
                              <span className="you-paid-info">Others owe you <strong>{getCurrencySymbol(e.currency)}{othersOweTotal(e).toFixed(2)}</strong></span>
                              <button className="settle-btn" onClick={() => handleSettleUp(e.id)}>Settle up</button>
                            </div>
                          )
                        )}
                        {e.imageUrl && <a href={e.imageUrl} target="_blank" rel="noreferrer">View bill</a>}
                      </div>
                      <div className="card-actions">
                        <button onClick={() => { startEditExpense(e); setShowExpenseModal(true) }}>Edit</button>
                        {(e.createdBy === currentUserId || (!e.createdBy && e.payerId === currentUserId)) && (
                          <button onClick={() => handleDeleteExpense(e)}>Delete</button>
                        )}
                      </div>
                    </li>
                  ))}
                  {sorted.length === 0 && <li className="muted">No expenses in this group yet</li>}
                </ul>
              </section>
            )
          })()}

          {/* ── Expenses tab ── */}
          {activeTab === 'expenses' && (
            <div className="expenses-columns">
              <section className="panel">
                <h3>Recurring Expenses</h3>
                <ul className="card-list">
                  {recurringTemplates.map((e) => {
                    const grpName = e.groupId ? (groups.find((g) => g.id === e.groupId)?.name || 'Unknown group') : null
                    const cadence = `${e.recurrenceInterval || 1} ${String(e.recurrenceType || 'MONTHLY').toLowerCase()}`
                    return (
                      <li key={e.id} className="card">
                        <div className="card-header">
                          <div>
                            <strong>{e.description}</strong>
                            <div className="muted" style={{ fontSize: '.75rem' }}>
                              {e.type === 'GROUP' ? `Group: ${grpName}` : 'Personal'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span>{getCurrencySymbol(e.currency)}{e.amount.toFixed(2)} ({e.currency})</span>
                          </div>
                        </div>
                        <div className="card-body">
                          <div className="muted">Repeats every {cadence}</div>
                          {e.recurrenceStartDate && (
                            <div className="muted">Start: {new Date(e.recurrenceStartDate).toLocaleDateString()}</div>
                          )}
                          {e.recurrenceEndDate && (
                            <div className="muted">Ends: {new Date(e.recurrenceEndDate).toLocaleDateString()}</div>
                          )}
                        </div>
                        <div className="card-actions">
                          {e.createdBy === currentUserId && (
                            <button onClick={() => { startEditExpense(e); setShowExpenseModal(true) }}>Edit</button>
                          )}
                          {(e.createdBy === currentUserId || (!e.createdBy && e.payerId === currentUserId)) && (
                            <button onClick={() => handleDeleteExpense(e)}>Delete</button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                  {recurringTemplates.length === 0 && <li className="muted">No recurring expenses yet</li>}
                </ul>
              </section>

              <section className="panel">
                <h3>Personal Expenses</h3>
                <ul className="card-list">
                  {[...personalExpenses]
                    .filter((e) => !(e.isRecurring || e.recurring))
                    .sort((a, b) => {
                      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
                      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
                      return db - da
                    })
                    .map((e) => (
                    <li key={e.id} className="card">
                      <div className="card-header">
                        <strong>{e.description}</strong>
                        <div style={{ textAlign: 'right' }}>
                          <span>{getCurrencySymbol(e.currency)}{e.amount.toFixed(2)} ({e.currency})</span>
                          {e.createdAt && <div className="muted" style={{ fontSize: '.75rem' }}>{new Date(e.createdAt).toLocaleString()}</div>}
                        </div>
                      </div>
                      <div className="card-body">
                        {e.imageUrl && <a href={e.imageUrl} target="_blank" rel="noreferrer">View bill</a>}
                      </div>
                        <div className="card-actions">
                          {e.createdBy === currentUserId && (
                            <button onClick={() => { startEditExpense(e); setShowExpenseModal(true) }}>Edit</button>
                          )}
                          {(e.createdBy === currentUserId || (!e.createdBy && e.payerId === currentUserId)) && (
                            <button onClick={() => handleDeleteExpense(e)}>Delete</button>
                          )}
                        </div>
                    </li>
                  ))}
                  {personalExpenses.length === 0 && <li className="muted">No personal expenses yet</li>}
                </ul>
              </section>

              <section className="panel">
                <h3>Group Expenses</h3>
                <ul className="card-list">
                  {[...allGroupExpenses]
                    .filter((e) => !(e.isRecurring || e.recurring))
                    .sort((a, b) => {
                      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
                      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
                      return db - da
                    })
                    .map((e) => {
                      const grpName = groups.find(g => g.id === e.groupId)?.name || 'Unknown group'
                      return (
                        <li key={e.id} className="card">
                          <div className="card-header">
                            <div>
                              <strong>{e.description}</strong>
                              <div className="muted" style={{ fontSize: '.75rem' }}>{grpName}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontWeight: 600 }}>{getCurrencySymbol(e.currency)}{userShare(e).toFixed(2)}</span>
                              <div className="muted" style={{ fontSize: '.7rem' }}>Your share of {getCurrencySymbol(e.currency)}{e.amount.toFixed(2)}</div>
                              {e.createdAt && <div className="muted" style={{ fontSize: '.75rem' }}>{new Date(e.createdAt).toLocaleString()}</div>}
                            </div>
                          </div>
                          <div className="card-body">
                            <div className="paid-by">Paid by <strong>{payerName(e.payerId)}</strong></div>
                            <div>{shareLabel(e)}</div>

                            {e.payerId !== currentUserId && (e.participantIds || []).includes(currentUserId) && (
                              settledExpenses.has(e.id) ? (
                                <div className="settled-text">✓ Settled up</div>
                              ) : (
                                <div className="owes-row">
                                  <span className="owes-amount">You owe <strong>{getCurrencySymbol(e.currency)}{userShare(e).toFixed(2)}</strong></span>
                                  <button className="settle-btn" onClick={() => handleSettleUp(e.id)}>Settle up</button>
                                </div>
                              )
                            )}

                            {e.payerId === currentUserId && (e.participantIds || []).length > 1 && (
                              settledExpenses.has(e.id) ? (
                                <div className="settled-text">✓ All settled</div>
                              ) : (
                                <div className="owes-row">
                                  <span className="you-paid-info">Others owe you <strong>{getCurrencySymbol(e.currency)}{othersOweTotal(e).toFixed(2)}</strong></span>
                                  <button className="settle-btn" onClick={() => handleSettleUp(e.id)}>Settle up</button>
                                </div>
                              )
                            )}
                            {e.imageUrl && <a href={e.imageUrl} target="_blank" rel="noreferrer">View bill</a>}
                          </div>
                          <div className="card-actions">
                            {e.createdBy === currentUserId && (
                              <button onClick={() => { startEditExpense(e); setShowExpenseModal(true) }}>Edit</button>
                            )}
                            {(e.createdBy === currentUserId || (!e.createdBy && e.payerId === currentUserId)) && (
                              <button onClick={() => handleDeleteExpense(e)}>Delete</button>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  {allGroupExpenses.length === 0 && <li className="muted">No group expenses yet</li>}
                </ul>
              </section>
            </div>
          )}

          {/* ── Activity tab ── */}
          {activeTab === 'activity' && (
            <section className="panel">
              <h2>Activity</h2>
              <ul className="list">
                {filteredActivities.map((a) => (
                  <li key={a.id}>
                    <div>{a.description}</div>
                    <small>{new Date(a.createdAt).toLocaleString()}</small>
                  </li>
                ))}
                {filteredActivities.length === 0 && <li className="muted">No activity yet</li>}
              </ul>
              {activityHasMore && (
                <button className="see-more-btn" onClick={async () => {
                  const nextPage = activityPage + 1;
                  setActivityPage(nextPage);
                  await fetchActivities(currentUserId, nextPage, true);
                }}>See more</button>
              )}
            </section>
          )}

          {/* ── Account tab — daily spending bar chart ── */}
          {activeTab === 'account' && (() => {
            const now = new Date()
            const year = now.getFullYear()
            const month = now.getMonth()
            const daysInMonth = new Date(year, month + 1, 0).getDate()

            // De-duplicate: allGroupExpenses may overlap with personalExpenses for group expenses the user paid
            const seenIds = new Set<string>()
            const allExpenses: Expense[] = []
            ;[...personalExpenses, ...allGroupExpenses].forEach(exp => {
              if (!seenIds.has(exp.id)) { seenIds.add(exp.id); allExpenses.push(exp) }
            })
            const dailyTotals: number[] = new Array(daysInMonth).fill(0)

            allExpenses.forEach((exp) => {
              if (!exp.createdAt) return
              const d = new Date(exp.createdAt)
              if (d.getFullYear() === year && d.getMonth() === month) {
                // Always count only user's own share
                if (exp.type === 'GROUP' && (exp.participantIds || []).includes(currentUserId)) {
                  dailyTotals[d.getDate() - 1] += userShare(exp)
                } else if (exp.type === 'PERSONAL' && exp.payerId === currentUserId) {
                  dailyTotals[d.getDate() - 1] += exp.amount
                }
              }
            })

            const maxVal = Math.max(...dailyTotals, 1)
            const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })
            const totalMonth = dailyTotals.reduce((s, v) => s + v, 0)

            return (
              <section className="panel">
                <h2>Daily Spending — {monthName}</h2>
                <p className="muted">Total this month: <strong style={{ color: '#fff' }}>₹{totalMonth.toFixed(2)}</strong></p>
                <div className="bar-chart">
                  {dailyTotals.map((val, i) => (
                    <div className="bar-col" key={i} title={`Day ${i + 1}: ₹${val.toFixed(2)}`}>
                      <div
                        className="bar-fill"
                        style={{ height: `${Math.max((val / maxVal) * 100, val > 0 ? 4 : 0)}%` }}
                      />
                      <span className="bar-label">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </section>
            )
          })()}
        </main>
      </div>

      {/* ── FAB (floating + button) ── */}
      <button className="fab" title="Add expense" onClick={() => setShowExpenseModal(true)}>
        ＋
      </button>

      {/* ── Expense modal ── */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => { setShowExpenseModal(false); setEditingExpense(null) }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button className="modal-close" onClick={() => { setShowExpenseModal(false); setEditingExpense(null) }}>✕</button>
            </div>
            <form onSubmit={(e) => { handleSaveExpense(e); setShowExpenseModal(false) }} className="form-vertical">
              <input
                type="text"
                placeholder="Description (e.g. Shopping)"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                required
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  required
                  style={{ flex: 2 }}
                />
                <select
                  value={expenseCurrency}
                  onChange={e => setExpenseCurrency(e.target.value)}
                  style={{ flex: 1, minWidth: 80 }}
                  required
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={isRecurringExpense}
                  onChange={(e) => setIsRecurringExpense(e.target.checked)}
                />{' '}
                Is this a recurring expense?
              </label>
              {isRecurringExpense && (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <label className="field-label">Start date</label>
                  <input
                    type="date"
                    value={recurrenceStartDate}
                    onChange={(e) => setRecurrenceStartDate(e.target.value)}
                    required={isRecurringExpense}
                  />
                  <label className="field-label">Recurs every</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {recurrenceType === 'CUSTOM' && (
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(e.target.value)}
                        style={{ flex: 1 }}
                        placeholder="Days"
                      />
                    )}
                    <select
                      value={recurrenceType}
                      onChange={(e) => {
                        const val = e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM'
                        setRecurrenceType(val)
                        if (val !== 'CUSTOM') setRecurrenceInterval('1')
                      }}
                      style={{ flex: 2 }}
                    >
                      <option value="DAILY">Day(s)</option>
                      <option value="WEEKLY">Week(s)</option>
                      <option value="MONTHLY">Month(s)</option>
                      <option value="YEARLY">Year(s)</option>
                      <option value="CUSTOM">Custom (N days)</option>
                    </select>
                  </div>
                  <label className="field-label">End date (optional)</label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  />
                </div>
              )}

              <label className="field-label" style={{ marginTop: '0.25rem' }}>Expense type</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <label className="checkbox-row">
                  <input type="radio" name="expType" checked={!isGroupExpense && !isFriendExpense}
                    onChange={() => { setIsGroupExpense(false); setIsFriendExpense(false) }} /> Personal
                </label>
                <label className="checkbox-row">
                  <input type="radio" name="expType" checked={isFriendExpense && !isGroupExpense}
                    onChange={() => { setIsFriendExpense(true); setIsGroupExpense(false) }} /> Friend
                </label>
                <label className="checkbox-row">
                  <input type="radio" name="expType" checked={isGroupExpense}
                    onChange={() => { setIsGroupExpense(true); setIsFriendExpense(false) }} /> Group
                </label>
              </div>

              {isFriendExpense && !isGroupExpense && (
                <>
                  <label className="field-label">Select friend</label>
                  <select value={selectedFriendId} onChange={(e) => setSelectedFriendId(e.target.value)} required>
                    <option value="">Choose a friend</option>
                    {currentFriends.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  {selectedFriendId && (
                    <>
                      <label className="field-label">Paid by</label>
                      <select value={expensePayerId || currentUserId} onChange={(e) => setExpensePayerId(e.target.value)}>
                        <option value={currentUserId}>{currentUser?.name || 'You'} (You)</option>
                        <option value={selectedFriendId}>{users.find(u => u.id === selectedFriendId)?.name || 'Friend'}</option>
                      </select>
                    </>
                  )}
                </>
              )}

              {isGroupExpense && (
                <>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    required
                  >
                    <option value="">Select group</option>
                    {filteredGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  {selectedGroupId && (
                    <>
                      <label className="field-label">Paid by</label>
                      <select
                        value={expensePayerId || currentUserId}
                        onChange={(e) => setExpensePayerId(e.target.value)}
                      >
                        {(groups.find((g) => g.id === selectedGroupId)?.memberIds || []).map((mid) => {
                          const member = users.find((u) => u.id === mid)
                          return (
                            <option key={mid} value={mid}>
                              {member ? member.name : mid}{mid === currentUserId ? ' (You)' : ''}
                            </option>
                          )
                        })}
                      </select>
                    </>
                  )}
                </>
              )}
              {(isGroupExpense || isFriendExpense) && (
                <select
                  value={splitMode}
                  onChange={(e) => {
                    setSplitMode(e.target.value as 'equal' | 'unequal' | 'percentage')
                    setCustomSplits({})
                  }}
                >
                  <option value="equal">Divide equally</option>
                  <option value="unequal">Divide unequally</option>
                  <option value="percentage">Divide by percentage</option>
                </select>
              )}

              {splitMode === "percentage" && (isGroupExpense || isFriendExpense) && (
                <div className="custom-splits-box">
                  <div className="custom-splits-title">Enter each person's percentage share:</div>

                  {(isGroupExpense
                    ? groups.find(g => g.id === selectedGroupId)?.memberIds
                    : [currentUserId, selectedFriendId]
                  )?.filter(Boolean).map((mid) => {
                    const member = users.find(u => u.id === mid)
                    return (
                      <div key={mid} className="custom-split-row">
                        <span className="custom-split-name">
                          {mid === currentUserId ? 'You' : member?.name || mid}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="0.00"
                          value={customSplits[mid] || ''}
                          onChange={(e) => setCustomSplits(prev => ({
                            ...prev,
                            [mid]: e.target.value
                          }))}
                        />
                        <span className="custom-split-rupee">%</span>
                      </div>
                    )
                  })}

                  <div className={`splits-remaining ${
                    remainingPercentage() === 0 ? 'splits-ok' : 'splits-off'
                  }`}>
                    {remainingPercentage() === 0
  ? '✓ Percentages add up to 100%!'
  : remainingPercentage() > 0
    ? `${remainingPercentage().toFixed(1)}% still to assign`
    : `${Math.abs(remainingPercentage()).toFixed(1)}% over 100% — reduce someone's share`
                    }
                  </div>
                </div>
              )}

              {splitMode === 'unequal' && (isGroupExpense || isFriendExpense) && (
                <div className="custom-splits-box">
                  <div className="custom-splits-title">Enter each person's share:</div>

                  {(isGroupExpense
                    ? groups.find(g => g.id === selectedGroupId)?.memberIds
                    : [currentUserId, selectedFriendId]
                  )?.filter(Boolean).map((mid) => {
                    const member = users.find(u => u.id === mid)
                    return (
                      <div key={mid} className="custom-split-row">
                        <span className="custom-split-name">
                          {mid === currentUserId ? 'You' : member?.name || mid}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={customSplits[mid] || ''}
                          onChange={(e) => setCustomSplits(prev => ({
                            ...prev,
                            [mid]: e.target.value
                          }))}
                        />
                        <span className="custom-split-rupee">₹</span>
                      </div>
                    )
                  })}

                  <div className={`splits-remaining ${
                    remainingAmount() === 0 ? 'splits-ok' : 'splits-off'
                  }`}>
                    {remainingAmount() === 0
                      ? '✓ Splits balanced!'
                      : remainingAmount() > 0
                        ? `₹${remainingAmount().toFixed(2)} still to assign`
                        : `₹${Math.abs(remainingAmount()).toFixed(2)} over total — reduce someone's share`
                    }
                  </div>
                </div>
              )}

              <input
                type="url"
                placeholder="Image URL (bill / screenshot, optional)"
                value={expenseImageUrl}
                onChange={(e) => setExpenseImageUrl(e.target.value)}
              />
              <button type="submit">{editingExpense ? 'Update expense' : 'Add expense'}</button>
              {editingExpense && (
                <button type="button" onClick={() => {
                  setEditingExpense(null)
                  setExpenseDescription('')
                  setExpenseAmount('')
                  setExpenseImageUrl('')
                  setIsRecurringExpense(false)
                  setRecurrenceStartDate('')
                  setRecurrenceType('MONTHLY')
                  setRecurrenceInterval('1')
                  setRecurrenceEndDate('')
                }}>
                  Cancel edit
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App