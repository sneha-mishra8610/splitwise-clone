import './App.css'
import React, { useEffect, useState, useCallback } from 'react'

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
  flaggedBy?: string[]
  expenseStatus?: 'Settled' | 'Unsettled'
  settledByUser?: Record<string, boolean>
}

type Activity = {
  id: string
  description: string
  createdAt: string
}

type ActivityFilter = 'ALL' | 'EXPENSE' | 'SETTLEMENT' | 'GROUP' | 'FRIEND'
type ActivitySortOrder = 'NEWEST' | 'OLDEST'

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

type DashboardSummary = {
  totalOwedToUser: number
  totalUserOwes: number
  netBalance: number
  spentThisMonth: number
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

function getSidebarIcon(tab: 'Home' | 'Groups' | 'Expenses' | 'Friends' | 'Activity' | 'Account') {
  const commonProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'sidebar-icon-svg',
    'aria-hidden': true,
  }

  switch (tab) {
    case 'Home':
      return (
        <svg {...commonProps}>
          <path d="M3 10.5 12 4l9 6.5" />
          <path d="M5.5 9.5V20h13V9.5" />
        </svg>
      )
    case 'Groups':
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="9" r="2.5" />
          <circle cx="16.5" cy="8" r="2" />
          <path d="M4.5 18c.7-2.3 2.5-3.5 5-3.5s4.3 1.2 5 3.5" />
          <path d="M13.5 17c.4-1.6 1.7-2.5 3.5-2.5 1.3 0 2.3.4 3 .9" />
        </svg>
      )
    case 'Expenses':
      return (
        <svg {...commonProps}>
          <rect x="5" y="4.5" width="14" height="15" rx="2.5" />
          <path d="M8.5 9h7" />
          <path d="M8.5 13h7" />
          <path d="M8.5 17h4" />
        </svg>
      )
    case 'Friends':
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="9" r="2.5" />
          <circle cx="16.5" cy="10" r="2.2" />
          <path d="M4.5 18c.8-2.4 2.7-3.7 5.2-3.7 2.4 0 4.2 1.2 5.1 3.3" />
          <path d="M14.2 17.4c.6-1.4 1.7-2.1 3.3-2.1 1.1 0 2 .2 2.8.8" />
        </svg>
      )
    case 'Activity':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7.8v4.7l3 1.9" />
        </svg>
      )
    case 'Account':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8.5" r="3" />
          <path d="M6 19c1.1-2.8 3.2-4.2 6-4.2s4.9 1.4 6 4.2" />
        </svg>
      )
    default:
      return null
  }
}

function App() {
  const [editLogDisplayCount, setEditLogDisplayCount] = useState(3);

  const [currentUserId, setCurrentUserId] = useState<string>(() => localStorage.getItem('currentUserId') || '');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);

  const [groupChats, setGroupChats] = useState<{ [groupId: string]: { user: string; message: string; timestamp: string }[] }>({});
  const [groupChatInputs, setGroupChatInputs] = useState<{ [groupId: string]: string }>({});

  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseChats, setExpenseChats] = useState<{ [expenseId: string]: { user: string; message: string; timestamp: string }[] }>({});
  const [expenseChatInputs, setExpenseChatInputs] = useState<{ [expenseId: string]: string }>({});

  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState('');


  const currentUser: User | null = users.find((u) => u.id === currentUserId) || null;
  const currentUserName = currentUser?.name || 'You';
  
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState('')

  async function handleSendExpenseChatMessage(expenseId: string) {
    const input = expenseChatInputs[expenseId]?.trim();
    if (!input) return;
    const exp = allGroupExpenses.find(e => e.id === expenseId) || personalExpenses.find(e => e.id === expenseId);
    const groupId = exp?.groupId;
    if (!groupId) return;
    try {
      const res = await authedFetch(`${API_BASE}/chat/${groupId}/expense/${expenseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUserId, message: input })
      });
      if (res.ok) {
        await fetchExpenseChatMessages(expenseId, groupId);
      }
    } catch { /* ignore */ }
    setExpenseChatInputs(prev => ({ ...prev, [expenseId]: '' }));
  }

  async function handleSendGroupChatMessage(groupId: string) {
    const input = groupChatInputs[groupId]?.trim();
    if (!input) return;
    try {
      const res = await authedFetch(`${API_BASE}/chat/${groupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUserId, message: input })
      });
      if (res.ok) {
        await fetchGroupChatMessages(groupId);
      }
    } catch { /* ignore */ }
    setGroupChatInputs(prev => ({ ...prev, [groupId]: '' }));
  }

    function resetExpenseForm() {
      setExpenseDescription('');
      setExpenseAmount('');
      setExpenseCurrency('INR');
      setIsGroupExpense(false);
      setIsFriendExpense(false);
      setSelectedFriendId('');
      setExpenseImageUrl('');
      setExpensePayerId('');
      setSplitMode('equal');
      setCustomSplits({});
      setIsRecurringExpense(false);
      setRecurrenceStartDate('');
      setRecurrenceType('MONTHLY');
      setRecurrenceInterval('1');
      setRecurrenceEndDate('');
      setSelectedGroupId('');
    }
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    localStorage.getItem('theme') === 'light' ? 'light' : 'dark',
  )
  const [groups, setGroups] = useState<Group[]>([])
  const [personalExpenses, setPersonalExpenses] = useState<Expense[]>([])
  const [groupExpenses, setGroupExpenses] = useState<Expense[]>([])
  const [allGroupExpenses, setAllGroupExpenses] = useState<Expense[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityPage, setActivityPage] = useState(0)
  const [activityHasMore, setActivityHasMore] = useState(true)

  const [expenseDetailView, setExpenseDetailView] = useState<Expense | null>(null)

  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('authToken'))

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

    const fetchGroupChatMessages = React.useCallback(
    async (groupId: string | null) => {
      if (!groupId) return;
      try {
        const res = await authedFetch(`${API_BASE}/chat/${groupId}`);
        if (!res.ok) return;
        const data = await res.json();
        const mapped = Array.isArray(data)
          ? data.map((msg: { senderId: string; message: string; timestamp: string }) => ({
              user: users.find(u => u.id === msg.senderId)?.name || msg.senderId || 'Unknown',
              message: msg.message,
              timestamp: msg.timestamp
            }))
          : [];
        setGroupChats(prev => ({ ...prev, [groupId]: mapped }));
      } catch {/* ignore */}
    },
    [authedFetch, users, setGroupChats]
  );

  const fetchExpenseChatMessages = useCallback(async (expenseId: string | null, groupId?: string | null) => {
    if (!expenseId) return;
    let gid = groupId;
    if (!gid) {
      const exp = allGroupExpenses.find(e => e.id === expenseId) || personalExpenses.find(e => e.id === expenseId);
      gid = exp?.groupId || '';
    }
    if (!gid) return;
    try {
      const res = await authedFetch(`${API_BASE}/chat/${gid}/expense/${expenseId}`);
      if (!res.ok) return;
      const data = await res.json();
      const mapped = Array.isArray(data)
        ? data.map((msg: { senderId: string; message: string; timestamp: string }) => ({
            user: users.find(u => u.id === msg.senderId)?.name || msg.senderId || 'Unknown',
            message: msg.message,
            timestamp: msg.timestamp
          }))
        : [];
      setExpenseChats(prev => ({ ...prev, [expenseId]: mapped }));
    } catch {/* */}
  }, [allGroupExpenses, personalExpenses, users, authedFetch]);
  
  const [friendNameToAdd, setFriendNameToAdd] = useState('')
  const [friendEmailToAdd, setFriendEmailToAdd] = useState('')
  const [friendAddError, setFriendAddError] = useState('')
  const [friendAddSuccess, setFriendAddSuccess] = useState('')

  const [groupName, setGroupName] = useState('')
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([])
  const [showCreateGroupPanel, setShowCreateGroupPanel] = useState(false)

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
  type ExpenseEditLog = {
    id?: string;
    editedBy: string;
    editTime: string;
    oldValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
    reason: string;
  };
  const [expenseEditLogs, setExpenseEditLogs] = useState<{ [expenseId: string]: ExpenseEditLog[] }>({});
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenseViewFilter, setExpenseViewFilter] = useState<'ALL' | 'PERSONAL' | 'GROUP' | 'RECURRING' | 'FLAGGED'>('ALL')

  const [activeTab, setActiveTab] = useState<'Home' | 'Groups' | 'Expenses' | 'Friends' | 'Activity' | 'Account'>('Home')

  const [groupDetailView, setGroupDetailView] = useState<string | null>(null)

    useEffect(() => {
  setEditLogDisplayCount(3);
  }, [expenseDetailView]);
  
  useEffect(() => {
    if (!groupDetailView) return;
    let stopped = false;
    async function poll() {
      await fetchGroupChatMessages(groupDetailView);
      if (!stopped) {
        setTimeout(poll, 3000);
      }
    }
    poll();
    return () => { stopped = true; };
  }, [groupDetailView,fetchGroupChatMessages]);

  useEffect(() => {
    const expense = editingExpense || expenseDetailView;
    if (!(showExpenseModal && editingExpense) && !expenseDetailView) return;
    let stopped = false;
    async function poll() {
      if (expense)
        await fetchExpenseChatMessages(expense.id, expense.groupId);
      if (!stopped) {
        setTimeout(poll, 3000);
      }
    }
    poll();
    return () => { stopped = true; };
  }, [showExpenseModal, editingExpense, expenseDetailView, fetchExpenseChatMessages]);

  const [groupSearch, setGroupSearch] = useState('')
  const [friendSearch, setFriendSearch] = useState('')
  const [activitySearch, setActivitySearch] = useState('')
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('ALL')
  const [activitySortOrder, setActivitySortOrder] = useState<ActivitySortOrder>('NEWEST')

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

  const [friendBalances, setFriendBalances] = useState<{ [friendId: string]: number }>({});

  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

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

  const fetchExpenseEditLogs = React.useCallback(async (expenseId: string) => {
    try {
      const res = await authedFetch(`${API_BASE}/expense-edit-logs/${expenseId}`);
      if (res.ok) {
        const data = await res.json();
        console.log("Fetched edit logs:", data);
        setExpenseEditLogs(prev => ({ ...prev, [expenseId]: data }));
      }
    } catch { /* ignore */ }
  }, [authedFetch]);
React.useEffect(() => {
    if (expenseDetailView) {
      fetchExpenseEditLogs(expenseDetailView.id);
    }
  }, [expenseDetailView, fetchExpenseEditLogs]);

  async function fetchFriendBalances() {
  if (!currentUserId) return;
  const res = await authedFetch(`${API_BASE}/users/${currentUserId}/friend-balances`);
  if (res.ok) {
    setFriendBalances(await res.json());
  }
}

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

  const fetchGroupExpenses = React.useCallback(async (groupId: string) => {
    try {
      const res = await authedFetch(`${API_BASE}/expenses/group/${groupId}`)
      if (!res.ok) return
      const data = await res.json()
      setGroupExpenses(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }, [authedFetch]);

  const fetchPersonalExpenses = React.useCallback(async (userId: string) => {
    try {
      const res = await authedFetch(`${API_BASE}/expenses/personal/${userId}`)
      if (!res.ok) return
      const data = await res.json()
      setPersonalExpenses(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }, [authedFetch]);

  const fetchAllGroupExpenses = React.useCallback(async () => {
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
  }, [authedFetch, currentUserId]);

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

  async function fetchDashboardSummary() {
  if (!currentUserId) return
  setDashboardLoading(true)
  setDashboardError('')
  try {
    const res = await authedFetch(`${API_BASE}/dashboard/summary/${currentUserId}`)
    if (res.ok) {
      setDashboardSummary(await res.json())
    } else {
      setDashboardError('Failed to fetch dashboard summary')
    }
  } catch {
    setDashboardError('Could not reach server')
  } finally {
    setDashboardLoading(false)
  }
}

useEffect(() => {
  if (activeTab === 'Home' && isAuthenticated && currentUserId) {
    fetchDashboardSummary()
  }
  // eslint-disable-next-line
}, [activeTab, isAuthenticated, currentUserId])

useEffect(() => {
  if (activeTab === 'Friends' && isAuthenticated && currentUserId) {
    fetchFriendBalances();
  }
}, [activeTab, isAuthenticated, currentUserId]);

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

  // --- Flag/Unflag Expense Logic ---
const refreshExpenseDetail = React.useCallback(async (expenseId: string) => {
  let updated: Expense | undefined = allGroupExpenses.find((e: Expense) => e.id === expenseId) || personalExpenses.find((e: Expense) => e.id === expenseId);
  if (!updated) {
    try {
      const res = await authedFetch(`${API_BASE}/expenses/${expenseId}`);
      if (res.ok) {
        updated = await res.json();
      }
    } catch {
      // ignore error
    }
  }
  if (updated) {
    setExpenseDetailView(updated);
    // Update in allGroupExpenses
    setAllGroupExpenses(prev => {
      const idx = prev.findIndex(e => e.id === expenseId);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = updated!;
        return copy;
      }
      return prev;
    });
    // Update in personalExpenses
    setPersonalExpenses(prev => {
      const idx = prev.findIndex(e => e.id === expenseId);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = updated!;
        return copy;
      }
      return prev;
    });
  }
}, [allGroupExpenses, personalExpenses, authedFetch, setExpenseDetailView, setAllGroupExpenses, setPersonalExpenses]);

const handleFlagExpense = React.useCallback(async (expenseId: string) => {
  try {
    const res = await authedFetch(`${API_BASE}/expenses/${expenseId}/flag?userId=${currentUserId}`, {
      method: 'POST'
    });
    if (res.ok) {
      await refreshExpenseDetail(expenseId);
      // Also refresh the relevant expense list
      const exp = allGroupExpenses.find(e => e.id === expenseId) || personalExpenses.find(e => e.id === expenseId);
      if (exp?.groupId) {
        await fetchGroupExpenses(exp.groupId);
        await fetchAllGroupExpenses();
      } else {
        await fetchPersonalExpenses(currentUserId);
      }
    }
  } catch {
    // ignore error
  }
}, [authedFetch, currentUserId, refreshExpenseDetail, allGroupExpenses, personalExpenses, fetchAllGroupExpenses, fetchGroupExpenses, fetchPersonalExpenses]);

const handleUnflagExpense = React.useCallback(async (expenseId: string) => {
  try {
    const res = await authedFetch(`${API_BASE}/expenses/${expenseId}/unflag?userId=${currentUserId}`, {
      method: 'POST'
    });
    if (res.ok) {
      await refreshExpenseDetail(expenseId);
      // Also refresh the relevant expense list
      const exp = allGroupExpenses.find(e => e.id === expenseId) || personalExpenses.find(e => e.id === expenseId);
      if (exp?.groupId) {
        await fetchGroupExpenses(exp.groupId);
        await fetchAllGroupExpenses();
      } else {
        await fetchPersonalExpenses(currentUserId);
      }
    }
  } catch {
    // ignore error
  }
}, [authedFetch, currentUserId, refreshExpenseDetail, allGroupExpenses, personalExpenses, fetchAllGroupExpenses, fetchGroupExpenses, fetchPersonalExpenses]);

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
      await fetchFriendBalances();
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
    await authedFetch(`${API_BASE}/expenses/${expenseId}/settle?userId=${currentUserId}`, { method: 'POST' });
  } catch { /* ignore */ }
  await fetchActivities(currentUserId);
  if (selectedGroupId) await fetchGroupExpenses(selectedGroupId);
  await fetchPersonalExpenses(currentUserId);
  await fetchAllGroupExpenses();
  await fetchDashboardSummary();
  await fetchFriendBalances();
}

  function getActivityCategory(activity: Activity): Exclude<ActivityFilter, 'ALL'> {
    const description = activity.description.toLowerCase()
    if (description.includes('settle') || description.includes('you owe') || description.includes('owes you')) {
      return 'SETTLEMENT'
    }
    if (description.includes('group')) {
      return 'GROUP'
    }
    if (description.includes('friend')) {
      return 'FRIEND'
    }
    return 'EXPENSE'
  }

  function getActivityTone(activity: Activity): 'positive' | 'negative' | 'neutral' {
    const description = activity.description.toLowerCase()
    if (description.includes('owes you') || description.includes('received') || description.includes('added')) {
      return 'positive'
    }
    if (description.includes('you owe') || description.includes('removed') || description.includes('deleted')) {
      return 'negative'
    }
    return 'neutral'
  }

  function getActivityBadge(activity: Activity): string {
    const category = getActivityCategory(activity)
    switch (category) {
      case 'SETTLEMENT':
        return 'ST'
      case 'GROUP':
        return 'GR'
      case 'FRIEND':
        return 'FR'
      case 'EXPENSE':
      default:
        return 'EX'
    }
  }

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase()),
  )

  const filteredActivities = activities
    .filter((activity) => activity.description.toLowerCase().includes(activitySearch.toLowerCase()))
    .filter((activity) => activityFilter === 'ALL' || getActivityCategory(activity) === activityFilter)
    .sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return activitySortOrder === 'NEWEST' ? diff : -diff
    })

  const activityFilterTabs: { key: ActivityFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: activities.length },
    { key: 'EXPENSE', label: 'Expenses', count: activities.filter((activity) => getActivityCategory(activity) === 'EXPENSE').length },
    { key: 'SETTLEMENT', label: 'Settlements', count: activities.filter((activity) => getActivityCategory(activity) === 'SETTLEMENT').length },
    { key: 'GROUP', label: 'Groups', count: activities.filter((activity) => getActivityCategory(activity) === 'GROUP').length },
    { key: 'FRIEND', label: 'Friends', count: activities.filter((activity) => getActivityCategory(activity) === 'FRIEND').length },
  ]

  const activityGroups = filteredActivities.reduce<Array<{ key: string; label: string; items: Activity[] }>>((groupsAcc, activity) => {
    const date = new Date(activity.createdAt)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const label = new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
    const existing = groupsAcc.find((group) => group.key === key)
    if (existing) {
      existing.items.push(activity)
      return groupsAcc
    }
    groupsAcc.push({ key, label, items: [activity] })
    return groupsAcc
  }, [])

  const activityStats = {
    total: activities.length,
    visible: filteredActivities.length,
    settlements: activities.filter((activity) => getActivityCategory(activity) === 'SETTLEMENT').length,
    expenses: activities.filter((activity) => getActivityCategory(activity) === 'EXPENSE').length,
  }

  const currentFriends: User[] = currentUser
    ? currentUser.friendIds
        .map((fid) => users.find((u) => u.id === fid))
        .filter((u): u is User => !!u)
        .filter((u) => u.name.toLowerCase().includes(friendSearch.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))
    : []

  const dashboardFriendBalances = currentFriends
    .map((friend) => ({
      ...friend,
      balance: Number(friendBalances[friend.id] ?? 0),
    }))
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))

  const dashboardActionFriends = dashboardFriendBalances.filter((friend) => friend.balance < 0)
  const recentDashboardActivities = [...activities].slice(0, 4)

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const dashboardDateLabel = new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  const dashboardExpensePool: Expense[] = (() => {
    const seen = new Set<string>()
    const merged: Expense[] = []
    ;[...personalExpenses, ...allGroupExpenses].forEach((expense) => {
      if (!seen.has(expense.id)) {
        seen.add(expense.id)
        merged.push(expense)
      }
    })
    return merged
  })()

  const monthlyTrend = (() => {
    const now = new Date()
    const buckets = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString('default', { month: 'short' }),
        total: 0,
      }
    })

    dashboardExpensePool.forEach((expense) => {
      if (!expense.createdAt) return
      const expenseDate = new Date(expense.createdAt)
      const key = `${expenseDate.getFullYear()}-${expenseDate.getMonth()}`
      const bucket = buckets.find((entry) => entry.key === key)
      if (!bucket) return

      if (expense.type === 'GROUP' && (expense.participantIds || []).includes(currentUserId)) {
        bucket.total += userShare(expense)
      } else if (expense.type === 'PERSONAL' && expense.payerId === currentUserId) {
        bucket.total += expense.amount
      }
    })

    const max = Math.max(...buckets.map((item) => item.total), 1)
    return { buckets, max }
  })()


  const expenseMix = (() => {
    let personal = 0
    let group = 0

    dashboardExpensePool.forEach((expense) => {
      if (expense.type === 'GROUP' && (expense.participantIds || []).includes(currentUserId)) {
        group += userShare(expense)
      } else if (expense.type === 'PERSONAL' && expense.payerId === currentUserId) {
        personal += expense.amount
      }
    })

    const total = personal + group
    const personalPct = total > 0 ? (personal / total) * 100 : 50
    const groupPct = total > 0 ? (group / total) * 100 : 50

    return {
      personal,
      group,
      total,
      personalPct,
      groupPct,
    }
  })()

  function formatRelativeTime(iso?: string) {
    if (!iso) return ''
    const diffMs = Date.now() - new Date(iso).getTime()
    const diffMin = Math.max(1, Math.floor(diffMs / 60000))
    if (diffMin < 60) return `${diffMin} min ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours} hr ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }

  const recurringTemplates: Expense[] = [...personalExpenses, ...allGroupExpenses]
    .filter((e) => e.isRecurring || e.recurring)
    .filter((e, idx, arr) => arr.findIndex((x) => x.id === e.id) === idx)
    .sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return db - da
    })

  const expenseWorkspacePool: Expense[] = [...personalExpenses, ...allGroupExpenses]
    .filter((e, idx, arr) => arr.findIndex((x) => x.id === e.id) === idx)
    .sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return db - da
    })

  const flaggedExpenses = expenseWorkspacePool.filter((expense) => (expense.flaggedBy?.length || 0) > 0)
  const nonRecurringExpenses = expenseWorkspacePool.filter((expense) => !(expense.isRecurring || expense.recurring))

  const expenseStats = {
    totalLogged: expenseWorkspacePool.reduce((sum, expense) => sum + expense.amount, 0),
    youOwe: dashboardSummary?.totalUserOwes ?? 0,
    owedToYou: dashboardSummary?.totalOwedToUser ?? 0,
    recurringCount: recurringTemplates.length,
    flaggedCount: flaggedExpenses.length,
    expenseCount: expenseWorkspacePool.length,
  }

  const expenseFilterTabs: { key: typeof expenseViewFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: nonRecurringExpenses.length },
    { key: 'PERSONAL', label: 'Personal', count: nonRecurringExpenses.filter((expense) => expense.type === 'PERSONAL').length },
    { key: 'GROUP', label: 'Group', count: nonRecurringExpenses.filter((expense) => expense.type === 'GROUP').length },
    { key: 'RECURRING', label: 'Recurring', count: recurringTemplates.length },
    { key: 'FLAGGED', label: 'Flagged', count: flaggedExpenses.length },
  ]

  const filteredExpenseFeed = expenseWorkspacePool.filter((expense) => {
    switch (expenseViewFilter) {
      case 'PERSONAL':
        return expense.type === 'PERSONAL' && !(expense.isRecurring || expense.recurring)
      case 'GROUP':
        return expense.type === 'GROUP' && !(expense.isRecurring || expense.recurring)
      case 'RECURRING':
        return !!(expense.isRecurring || expense.recurring)
      case 'FLAGGED':
        return (expense.flaggedBy?.length || 0) > 0
      case 'ALL':
      default:
        return !(expense.isRecurring || expense.recurring)
    }
  })

  const expensePageTitle = (() => {
    const activeFilter = expenseFilterTabs.find((tab) => tab.key === expenseViewFilter)
    return activeFilter ? `${activeFilter.label} expenses` : 'Expenses'
  })()

  if (!isAuthenticated) {
    return (
      <div className={`app ${theme === 'light' ? 'light-mode' : ''}`}>
        <header className="app-header">
          <div className="header-left">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">🌙</button>
            <h1>Finwise</h1>
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
  const groupOverview = sortedGroups.map((group) => {
    const expenses = allGroupExpenses.filter((expense) => expense.groupId === group.id)
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const yourShare = expenses.reduce((sum, expense) => {
      if ((expense.participantIds || []).includes(currentUserId)) {
        return sum + userShare(expense)
      }
      return sum
    }, 0)
    const unsettledCount = expenses.filter((expense) => expense.expenseStatus !== 'Settled').length
    const latestExpense = [...expenses].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return db - da
    })[0]

    return {
      group,
      total,
      yourShare,
      unsettledCount,
      latestLabel: latestExpense?.createdAt
        ? new Date(latestExpense.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' })
        : 'No activity yet',
    }
  })

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
          <h1 style={{ margin: 0 }}>Finwise</h1>
        </div>
        <div className="header-center">
          {['Groups', 'Friends', 'Activity'].includes(activeTab) && !groupDetailView && (
            <input
              type="text"
              className="search-input"
              placeholder={`Search ${activeTab}`}
              value={
                activeTab === 'Groups'
                  ? groupSearch
                  : activeTab === 'Friends'
                  ? friendSearch
                  : activitySearch
              }
              onChange={(e) => {
                if (activeTab === 'Groups') setGroupSearch(e.target.value)
                else if (activeTab === 'Friends') setFriendSearch(e.target.value)
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
          <div className="panel" style={{ minWidth: 320, maxWidth: 400, boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            <h2>Notifications</h2>
            {loadingNotifications ? (
              <div>Loading...</div>
            ) : notificationError ? (
              <div className="error-text">{notificationError}</div>
            ) : pendingExpenses.length === 0 ? (
              <div>No unsettled expenses!</div>
            ) : (
              <ul className="card-list" style={{ maxHeight: 300, overflowY: 'auto' }}>
                {pendingExpenses.map(e => (
                  <li key={e.id} className="card" style={{ marginBottom: 12 }}>
                    <strong>{e.description}</strong><br />
                    Amount: ₹{e.amount} <br />
                    Type: {e.type}
                  </li>
                ))}
              </ul>
            )}
            <button className="icon-btn" style={{ marginTop: 16 }} onClick={() => setShowNotifications(false)}>Close</button>
          </div>
        </div>

      )}

      <div className="layout">
        <aside className="sidebar">
          <section className="panel sidebar-nav-panel">
            <p className="sidebar-nav-label">Navigation</p>
            <nav className="sidebar-tabs">
              {['Home', 'Groups', 'Expenses', 'Friends', 'Activity', 'Account'].map((tab) => (
                <button
                  key={tab}
                  className={activeTab === tab ? 'sidebar-tab sidebar-tab-active' : 'sidebar-tab'}
                  onClick={() => { setActiveTab(tab as typeof activeTab); setGroupDetailView(null) }}
                >
                  <span className="sidebar-tab-icon" aria-hidden="true">{getSidebarIcon(tab as typeof activeTab)}</span>
                  <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                </button>
              ))}
            </nav>
          </section>
          {activeTab === 'Account' && currentUser && (
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
          {/* ── Home/Dashboard tab ── */}
          {false && activeTab === 'Home' && currentUser && (() => { const currentUser = {} as User; return (
  <section className="panel" style={{ maxWidth: 400, margin: '2rem auto' }}>
    <h2>Welcome, {currentUser.name}!</h2>
    <ul>
      <li><strong>Groups:</strong> {groups.length}</li>
      <li><strong>Friends:</strong> {currentUser.friendIds.length}</li>
      <li><strong>Personal Expenses:</strong> {personalExpenses.length}</li>
      <li><strong>Group Expenses:</strong> {allGroupExpenses.length}</li>
    </ul>
  </section>
          )})()}
          {false && activeTab === 'Home' && (() => { const dashboardSummary = {} as DashboardSummary; return (
  <section className="panel" style={{ maxWidth: 400, margin: '2rem auto' }}>
    <h2>Dashboard Summary</h2>
    {dashboardLoading ? (
      <div>Loading...</div>
    ) : dashboardError ? (
      <div className="error-text">{dashboardError}</div>
    ) : dashboardSummary ? (
      <ul>
        <li><strong>Total Owed To You:</strong> ₹{dashboardSummary.totalOwedToUser.toFixed(2)}</li>
        <li><strong>Total You Owe:</strong> ₹{dashboardSummary.totalUserOwes.toFixed(2)}</li>
        <li><strong>Net Balance:</strong> ₹{dashboardSummary.netBalance.toFixed(2)}</li>
        <li><strong>Spent This Month:</strong> ₹{dashboardSummary.spentThisMonth.toFixed(2)}</li>
      </ul>
    ) : (
      <div>No summary available.</div>
    )}
  </section>
          )})()}

          {/* ── Friends tab ── */}
          {activeTab === 'Home' && currentUser && (
            <section className="dashboard-shell">
              <div className="dashboard-hero panel">
                <div>
                  <p className="dashboard-breadcrumb">Finwise / Dashboard</p>
                  <h2>{greeting}, {currentUser.name}</h2>
                  <p className="dashboard-subtitle">{dashboardDateLabel} - here is your financial snapshot</p>
                </div>
                <div className="dashboard-range">
                  <button className="range-pill range-pill-active" type="button">This month</button>
                  <button className="range-pill" type="button">Quarter</button>
                  <button className="range-pill" type="button">Year</button>
                </div>
              </div>

              {dashboardLoading ? (
                <section className="panel">
                  <div>Loading dashboard...</div>
                </section>
              ) : dashboardError ? (
                <section className="panel">
                  <div className="error-text">{dashboardError}</div>
                </section>
              ) : dashboardSummary ? (
                <>
                  <div className="dashboard-stats">
                    <article className="panel dashboard-stat-card">
                      <span className="dashboard-stat-label">You owe</span>
                      <strong className="dashboard-stat-value negative">{getCurrencySymbol('INR')}{dashboardSummary.totalUserOwes.toFixed(2)}</strong>
                      <span className="dashboard-stat-note">{dashboardActionFriends.length} friend{dashboardActionFriends.length === 1 ? '' : 's'} need settlement</span>
                    </article>
                    <article className="panel dashboard-stat-card">
                      <span className="dashboard-stat-label">Owed to you</span>
                      <strong className="dashboard-stat-value positive">{getCurrencySymbol('INR')}{dashboardSummary.totalOwedToUser.toFixed(2)}</strong>
                      <span className="dashboard-stat-note">{dashboardFriendBalances.filter((friend) => friend.balance > 0).length} incoming balance{dashboardFriendBalances.filter((friend) => friend.balance > 0).length === 1 ? '' : 's'}</span>
                    </article>
                    <article className="panel dashboard-stat-card">
                      <span className="dashboard-stat-label">Total spent</span>
                      <strong className="dashboard-stat-value">{getCurrencySymbol('INR')}{dashboardSummary.spentThisMonth.toFixed(2)}</strong>
                      <span className="dashboard-stat-note">{groups.length} groups, {currentFriends.length} friends</span>
                    </article>
                    <article className="panel dashboard-stat-card">
                      <span className="dashboard-stat-label">Net balance</span>
                      <strong className={`dashboard-stat-value ${dashboardSummary.netBalance >= 0 ? 'positive' : 'negative'}`}>
                        {dashboardSummary.netBalance >= 0 ? '+' : '-'}{getCurrencySymbol('INR')}{Math.abs(dashboardSummary.netBalance).toFixed(2)}
                      </strong>
                      <span className="dashboard-stat-note">
                        {dashboardSummary.netBalance >= 0 ? 'You are in the green' : 'You owe more than you are owed'}
                      </span>
                    </article>
                  </div>

                  <div className="dashboard-main-grid">
                    <article className="panel dashboard-trend-panel">
                      <div className="dashboard-panel-head">
                        <h3>Spending trend</h3>
                        <span className="muted">Last 6 months</span>
                      </div>
                      <div className="dashboard-trend-chart">
                        {monthlyTrend.buckets.map((bucket) => (
                          <div key={bucket.key} className="dashboard-trend-col">
                            <div
                              className="dashboard-trend-bar"
                              style={{ height: `${Math.max((bucket.total / monthlyTrend.max) * 100, bucket.total > 0 ? 8 : 0)}%` }}
                              title={`${bucket.label}: ${getCurrencySymbol('INR')}${bucket.total.toFixed(2)}`}
                            />
                            <span>{bucket.label}</span>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="panel dashboard-mix-panel">
                      <div className="dashboard-panel-head">
                        <h3>Expense mix</h3>
                        <span className="muted">Personal vs shared</span>
                      </div>
                      <div className="dashboard-mix-layout">
                        <div
                          className="dashboard-donut"
                          style={{
                            background: `conic-gradient(#6c5ce7 0 ${expenseMix.personalPct}%, #8be0cb ${expenseMix.personalPct}% 100%)`,
                          }}
                        >
                          <div className="dashboard-donut-hole">
                            <strong>{expenseMix.total > 0 ? `${Math.round(expenseMix.personalPct)}%` : '0%'}</strong>
                            <span>Personal</span>
                          </div>
                        </div>
                        <div className="dashboard-legend">
                          <div className="dashboard-legend-row">
                            <span className="dashboard-legend-dot personal-dot" />
                            <span>Personal</span>
                            <strong>{getCurrencySymbol('INR')}{expenseMix.personal.toFixed(2)}</strong>
                          </div>
                          <div className="dashboard-legend-row">
                            <span className="dashboard-legend-dot group-dot" />
                            <span>Group share</span>
                            <strong>{getCurrencySymbol('INR')}{expenseMix.group.toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>
                    </article>
                  </div>

                  <div className="dashboard-bottom-grid">
                    <article className="panel dashboard-list-panel">
                      <div className="dashboard-panel-head">
                        <h3>Friend balances</h3>
                        <span className="muted">Top relationships</span>
                      </div>
                      <div className="dashboard-balance-list">
                        {dashboardFriendBalances.slice(0, 4).map((friend) => (
                          <div key={friend.id} className="dashboard-balance-row">
                            <div className="dashboard-avatar">{friend.name.slice(0, 2).toUpperCase()}</div>
                            <div className="dashboard-balance-meta">
                              <strong>{friend.name}</strong>
                              <span className={friend.balance > 0 ? 'positive' : friend.balance < 0 ? 'negative' : 'muted'}>
                                {friend.balance > 0
                                  ? `owes you ${getCurrencySymbol('INR')}${friend.balance.toFixed(2)}`
                                  : friend.balance < 0
                                  ? `you owe ${getCurrencySymbol('INR')}${Math.abs(friend.balance).toFixed(2)}`
                                  : 'settled'}
                              </span>
                            </div>
                          </div>
                        ))}
                        {dashboardFriendBalances.length === 0 && <div className="muted">No friend balances yet.</div>}
                      </div>
                    </article>

                    <article className="panel dashboard-list-panel">
                      <div className="dashboard-panel-head">
                        <h3>Action required</h3>
                        <span className="muted">Pending settlements</span>
                      </div>
                      <div className="dashboard-action-list">
                        {dashboardActionFriends.slice(0, 4).map((friend) => (
                          <div key={friend.id} className="dashboard-action-row">
                            <div>
                              <strong>Settle with {friend.name}</strong>
                              <div className="muted">Outstanding balance is still open</div>
                            </div>
                            <button
                              className="settle-btn"
                              onClick={async () => {
                                await authedFetch(`${API_BASE}/expenses/settle-with-friend?userId=${currentUserId}&friendId=${friend.id}`, { method: 'POST' })
                                await fetchFriendBalances()
                                await fetchDashboardSummary()
                                await fetchActivities(currentUserId)
                              }}
                            >
                              Settle
                            </button>
                          </div>
                        ))}
                        {dashboardActionFriends.length === 0 && <div className="muted">No action needed right now.</div>}
                      </div>
                    </article>

                    <article className="panel dashboard-list-panel">
                      <div className="dashboard-panel-head">
                        <h3>Recent activity</h3>
                        <span className="muted">Latest updates</span>
                      </div>
                      <div className="dashboard-activity-list">
                        {recentDashboardActivities.map((activity) => (
                          <div key={activity.id} className="dashboard-activity-row">
                            <span className="dashboard-activity-dot" />
                            <div>
                              <strong>{activity.description}</strong>
                              <div className="muted">{formatRelativeTime(activity.createdAt)}</div>
                            </div>
                          </div>
                        ))}
                        {recentDashboardActivities.length === 0 && <div className="muted">No activity yet.</div>}
                      </div>
                    </article>
                  </div>
                </>
              ) : (
                <section className="panel">
                  <div>No summary available.</div>
                </section>
              )}
            </section>
          )}

          {activeTab === 'Friends' && (
            <>
              <section className="friends-shell">
                <div className="friends-hero panel">
                  <div>
                    <p className="dashboard-breadcrumb">Finwise / Friends</p>
                    <h2>Friends</h2>
                    <p className="friends-subtitle">{currentFriends.length} friends · {friendInvitations.length} pending</p>
                  </div>
                </div>

                <div className="friends-top-grid">
                  <section className="panel friends-block">
                    <div className="friends-block-head">
                      <h3>Pending invitations</h3>
                    </div>
                    <div className="friends-invite-list">
                      {friendInvitations.length > 0 ? friendInvitations.map((inv) => {
                        const inviterUser = users.find((u) => u.id === inv.inviterUserId)
                        const displayName = inviterUser?.name || 'Someone'
                        const displayEmail = inviterUser?.email || inv.inviteeEmail
                        return (
                          <div key={inv.id} className="friends-invite-row">
                            <div className="friends-avatar invite-avatar">{displayName.slice(0, 2).toUpperCase()}</div>
                            <div className="friends-person-meta">
                              <strong>{displayName}</strong>
                              <span>{displayEmail}</span>
                            </div>
                            <div className="friends-inline-actions">
                              <button className="accept-btn" onClick={() => handleAcceptFriendInvitation(inv.id)}>Accept</button>
                              <button className="decline-btn" onClick={() => handleDeclineFriendInvitation(inv.id)}>Decline</button>
                            </div>
                          </div>
                        )
                      }) : (
                        <p className="muted">No pending invitations right now.</p>
                      )}
                    </div>
                  </section>

                  <section className="panel friends-block">
                    <div className="friends-block-head">
                      <h3>Add friend</h3>
                    </div>
                    <form onSubmit={handleAddFriend} className="friends-add-form">
                      <label className="friends-field">
                        <span>Friend's name</span>
                        <input
                          type="text"
                          placeholder="Friend's name"
                          value={friendNameToAdd}
                          onChange={(e) => setFriendNameToAdd(e.target.value)}
                        />
                      </label>
                      <label className="friends-field">
                        <span>Friend's email (required)</span>
                        <input
                          type="email"
                          placeholder="Friend's email (required)"
                          value={friendEmailToAdd}
                          onChange={(e) => setFriendEmailToAdd(e.target.value)}
                          required
                        />
                      </label>
                      <button type="submit" className="friends-primary-btn">Send friend request</button>
                    </form>
                    {friendAddError && <p className="error-text" style={{ marginTop: '0.5rem' }}>{friendAddError}</p>}
                    {friendAddSuccess && <p className="success-text" style={{ marginTop: '0.5rem' }}>{friendAddSuccess}</p>}
                  </section>
                </div>
              </section>

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
                <div className="friends-block-head">
                  <h3>My friends</h3>
                </div>
                {currentFriends.length === 0 ? (
                  <p className="muted">No friends yet - add someone above!</p>
                ) : (
                  <ul className="friends-list">
                    {currentFriends.map((f) => (
                      <li key={f.id} className="friends-list-row">
                        <div className="friends-person">
                          <div className="friends-avatar">{f.name.slice(0, 2).toUpperCase()}</div>
                          <div className="friends-person-meta">
                            <strong>{f.name}</strong>
                            <span>{f.email}</span>
                          </div>
                        </div>
                        <div className="friends-balance-area">
                          <span className={`friends-balance ${friendBalances[f.id] > 0 ? 'positive' : friendBalances[f.id] < 0 ? 'negative' : ''}`}>
                            {friendBalances[f.id] > 0
                              ? `Owes you ${getCurrencySymbol('INR')}${Number(friendBalances[f.id]).toFixed(2)}`
                              : friendBalances[f.id] < 0
                              ? `You owe ${getCurrencySymbol('INR')}${Math.abs(Number(friendBalances[f.id])).toFixed(2)}`
                              : 'Settled'}
                          </span>
                          <div className="friends-inline-actions">
                            {friendBalances[f.id] < 0 ? (
                              <button
                                className="accept-btn"
                                onClick={async () => {
                                  await authedFetch(`${API_BASE}/expenses/settle-with-friend?userId=${currentUserId}&friendId=${f.id}`, { method: 'POST' })
                                  await fetchFriendBalances()
                                  await fetchDashboardSummary()
                                  await fetchActivities(currentUserId)
                                }}
                              >
                                Settle
                              </button>
                            ) : friendBalances[f.id] > 0 ? (
                              <button className="decline-btn friends-remind-btn">Remind</button>
                            ) : null}
                            <button className="icon-btn" title="Edit" onClick={() => startEditFriend(f)}>Edit</button>
                            <button className="icon-btn danger" title="Remove" onClick={() => handleRemoveFriend(f.id)}>Remove</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {pendingInvitations.filter(inv => inv.type === 'FRIEND').length > 0 && (
                <section className="panel">
                  <div className="friends-block-head">
                    <h3>Sent friend requests</h3>
                  </div>
                  <div className="friends-invite-list">
                    {pendingInvitations.filter(inv => inv.type === 'FRIEND').map((inv) => (
                      <div key={inv.id} className="friends-invite-row sent-request-row">
                        <div className="friends-avatar request-avatar">{(inv.inviteeName || inv.inviteeEmail).slice(0, 2).toUpperCase()}</div>
                        <div className="friends-person-meta">
                          <strong>{inv.inviteeName || inv.inviteeEmail}</strong>
                          <span>{inv.inviteeEmail}</span>
                        </div>
                        <span className="friends-awaiting">Awaiting response</span>
                      </div>
                    ))}
                  </div>
                  <p className="muted" style={{ marginTop: '0.5rem' }}>These people will see your friend request when they log in.</p>
                </section>
              )}
            </>
          )}

          {false && activeTab === 'Friends' && (
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
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <strong>{f.name}</strong>
          <span className="muted" style={{ marginLeft: '0.5rem' }}>{f.email}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Balance */}
          <span style={{
            minWidth: 90,
            textAlign: 'right',
            color: friendBalances[f.id] > 0 ? 'green' : friendBalances[f.id] < 0 ? 'red' : 'gray'
          }}>
            {friendBalances[f.id] > 0
              ? `Owes you ₹${friendBalances[f.id]}`
              : friendBalances[f.id] < 0
              ? `You owe ₹${-friendBalances[f.id]}`
              : 'Settled'}
          </span>
          {/* Action button */}
          {friendBalances[f.id] < 0 ? (
          <button
          className="icon-btn"
          style={{ color: 'red' }}
          onClick={async () => {
          await authedFetch(`${API_BASE}/expenses/settle-with-friend?userId=${currentUserId}&friendId=${f.id}`, { method: 'POST' });
          await fetchFriendBalances();
          await fetchActivities(currentUserId);
          }}
          >
          Settle
          </button>
          ) : friendBalances[f.id] > 0 ? (
          <button className="icon-btn" style={{ color: 'green' }}>Remind</button>
          ) : null}
          {/* Edit and delete icons/buttons */}
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
          {activeTab === 'Groups' && !groupDetailView && (
            <>
              <section className="groups-shell">
                <div className="groups-hero panel">
                  <div>
                    <p className="dashboard-breadcrumb">Finwise / Groups</p>
                    <h2>Groups</h2>
                    <p className="groups-subtitle">{sortedGroups.length} active groups</p>
                  </div>
                </div>

                <div className="groups-card-grid">
                  {groupOverview.map(({ group, total, yourShare, unsettledCount, latestLabel }) => (
                    <button
                      key={group.id}
                      type="button"
                      className="panel groups-summary-card"
                      onClick={() => { setSelectedGroupId(group.id); setGroupDetailView(group.id); fetchGroupExpenses(group.id) }}
                    >
                      <div className="groups-summary-icon">{group.name.slice(0, 1).toUpperCase()}</div>
                      <div className="groups-summary-body">
                        <strong>{group.name}</strong>
                        <span>{group.memberIds.length} members · {latestLabel}</span>
                        <div className="groups-summary-metric">Total: {getCurrencySymbol('INR')}{total.toFixed(2)}</div>
                        <div className="groups-summary-metric">Your share: {getCurrencySymbol('INR')}{yourShare.toFixed(2)}</div>
                        <div className={`groups-summary-status ${unsettledCount > 0 ? 'negative' : 'positive'}`}>
                          {unsettledCount > 0 ? `${unsettledCount} unsettled` : 'All settled'}
                        </div>
                      </div>
                      <div className="groups-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" title="Edit" onClick={() => startEditGroup(group)}>Edit</button>
                        <button className="icon-btn danger" title="Delete" onClick={() => handleDeleteGroup(group.id)}>Delete</button>
                      </div>
                    </button>
                  ))}

                  <button
                    type="button"
                    className="panel groups-new-card"
                    onClick={() => setShowCreateGroupPanel((prev) => !prev)}
                  >
                    <span className="groups-new-plus">+</span>
                    <span>New group</span>
                  </button>
                </div>
              </section>

              {showCreateGroupPanel && (
                <section className="panel">
                  <div className="groups-block-head">
                    <h3>Create group</h3>
                  </div>
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
              )}

              {editingGroup && (
                <section className="panel">
                  <h2>Edit Group - {editingGroup!.name}</h2>
                  <form onSubmit={handleUpdateGroup} className="form-vertical">
                    <label className="field-label">Group name</label>
                    <input type="text" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} required />

                    <label className="field-label" style={{ marginTop: '0.75rem' }}>Members</label>
                    <div className="member-list">
                      {editGroupMemberIds.map((mid) => {
                        const member = users.find((u) => u.id === mid)
                        if (!member) return null
                        const isOwner = mid === editingGroup!.ownerId
                        return (
                          <div key={mid} className="member-row">
                            <span>{member.name} <span className="muted">({member.email})</span></span>
                            {isOwner ? (
                              <span className="badge">Owner</span>
                            ) : (
                              <button type="button" className="icon-btn danger" title="Remove member" onClick={() => toggleEditGroupMember(mid)}>Remove</button>
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

              {groupInvitations.length > 0 && (
                <section className="panel">
                  <div className="groups-block-head">
                    <h3>Group invitations</h3>
                  </div>
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
                              <button className="accept-btn" title="Accept" onClick={() => handleAcceptGroupInvitation(inv.id)}>Accept</button>
                              <button className="decline-btn" title="Decline" onClick={() => handleDeclineGroupInvitation(inv.id)}>Decline</button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
            </>
          )}

          {false && activeTab === 'Groups' && !groupDetailView && (
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
                  <h2>Edit Group — {editingGroup!.name}</h2>
                  <form onSubmit={handleUpdateGroup} className="form-vertical">
                    <label className="field-label">Group name</label>
                    <input type="text" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} required />

                    <label className="field-label" style={{ marginTop: '0.75rem' }}>Members</label>
                    <div className="member-list">
                      {editGroupMemberIds.map((mid) => {
                        const member = users.find((u) => u.id === mid)
                        if (!member) return null
                        const isOwner = mid === editingGroup!.ownerId
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
          {activeTab === 'Groups' && groupDetailView && (() => {
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
                    <li key={e.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setExpenseDetailView(e)}>
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
  e.settledByUser?.[currentUserId] ? (
    <div className="settled-text">✓ Settled up</div>
  ) : (
    <div className="owes-row">
      <span className="owes-amount">You owe <strong>{getCurrencySymbol(e.currency)}{userShare(e).toFixed(2)}</strong></span>
      <button className="settle-btn" onClick={ev => { ev.stopPropagation(); handleSettleUp(e.id) }}>Settle up</button>
    </div>
  )
)}
                        {/* Payer: others owe you */}
                        {e.payerId === currentUserId && (e.participantIds || []).length > 1 && (
  e.expenseStatus === 'Settled' ? (
    <div className="settled-text">✓ All settled</div>
  ) : (
    <div className="owes-row">
      <span className="you-paid-info">Others owe you <strong>{getCurrencySymbol(e.currency)}{othersOweTotal(e).toFixed(2)}</strong></span>
    </div>
  )
)}
                        {e.imageUrl && <a href={e.imageUrl} target="_blank" rel="noreferrer">View bill</a>}
                      </div>
                      <div className="card-actions">
                        <button onClick={ev => { ev.stopPropagation(); startEditExpense(e); setShowExpenseModal(true) }}>Edit</button>
                        {(e.createdBy === currentUserId || (!e.createdBy && e.payerId === currentUserId)) && (
                          <button onClick={ev => { ev.stopPropagation(); handleDeleteExpense(e) }}>Delete</button>
                        )}
                      </div>
                    </li>
                  ))}
                  {sorted.length === 0 && <li className="muted">No expenses in this group yet</li>}
                </ul>

                {/* Group Chat UI */}
                <div className="group-chat-panel" style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                  <h3>Group Chat</h3>
                  <div className="group-chat-messages" style={{ maxHeight: 200, overflowY: 'auto', marginBottom: '1rem', background: '#222', padding: '0.5rem', borderRadius: 6 }}>
                    {(groupChats[groupDetailView] || []).length === 0 && <div className="muted">No messages yet.</div>}
                    {(groupChats[groupDetailView] || []).map((msg, idx) => (
                      <div key={idx} style={{ marginBottom: 8 }}>
                        <span style={{ fontWeight: msg.user === currentUserName ? 'bold' : 'normal', color: msg.user === currentUserName ? '#6cf' : '#fff' }}>{msg.user}:</span> <span>{msg.message}</span>
                        <div className="muted" style={{ fontSize: '0.7rem' }}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={groupChatInputs[groupDetailView] || ''}
                      onChange={e => setGroupChatInputs(prev => ({ ...prev, [groupDetailView!]: e.target.value }))}
                      placeholder="Type a message..."
                      style={{ flex: 1 }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSendGroupChatMessage(groupDetailView!); }}
                    />
                    <button type="button" onClick={() => handleSendGroupChatMessage(groupDetailView!)} disabled={!(groupChatInputs[groupDetailView]?.trim())}>Send</button>
                  </div>
                </div>
              </section>
            )
          })()}

          {/* ── Expenses tab ── */}
          {activeTab === 'Expenses' && (
            <section className="expenses-shell">
              <div className="expenses-hero panel">
                <div>
                  <p className="dashboard-breadcrumb">Finwise / Expenses</p>
                  <h2>Expenses</h2>
                  <p className="expenses-subtitle">
                    {new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())} - {expenseStats.expenseCount} expenses logged
                  </p>
                </div>
                <div className="expenses-hero-actions">
                  <button type="button" className="icon-btn" onClick={() => setExpenseDetailView(null)}>Clear selection</button>
                  <button type="button" onClick={() => { resetExpenseForm(); setEditingExpense(null); setShowExpenseModal(true) }}>Add expense</button>
                </div>
              </div>

              <div className="expenses-stat-grid">
                <article className="panel expenses-stat-card">
                  <span className="expenses-stat-label">Total logged</span>
                  <strong className="expenses-stat-value">{getCurrencySymbol('INR')}{expenseStats.totalLogged.toFixed(2)}</strong>
                  <span className="expenses-stat-note">Across personal, group, and recurring items</span>
                </article>
                <article className="panel expenses-stat-card">
                  <span className="expenses-stat-label">You owe</span>
                  <strong className="expenses-stat-value negative">{getCurrencySymbol('INR')}{expenseStats.youOwe.toFixed(2)}</strong>
                  <span className="expenses-stat-note">Outstanding balances waiting on you</span>
                </article>
                <article className="panel expenses-stat-card">
                  <span className="expenses-stat-label">Owed to you</span>
                  <strong className="expenses-stat-value positive">{getCurrencySymbol('INR')}{expenseStats.owedToYou.toFixed(2)}</strong>
                  <span className="expenses-stat-note">Incoming settlements from shared expenses</span>
                </article>
                <article className="panel expenses-stat-card">
                  <span className="expenses-stat-label">Review queue</span>
                  <strong className="expenses-stat-value">{expenseStats.flaggedCount}</strong>
                  <span className="expenses-stat-note">{expenseStats.recurringCount} recurring templates active</span>
                </article>
              </div>

              <div className="expenses-main-grid">
                <div className="expenses-feed">
                  <section className="panel expenses-feed-panel">
                    <div className="expenses-feed-head">
                      <div>
                        <h3>{expensePageTitle}</h3>
                        <p className="muted">Select an expense to inspect history, chat, and actions.</p>
                      </div>
                      <div className="expenses-filter-bar">
                        {expenseFilterTabs.map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            className={expenseViewFilter === tab.key ? 'expenses-filter-chip expenses-filter-chip-active' : 'expenses-filter-chip'}
                            onClick={() => setExpenseViewFilter(tab.key)}
                          >
                            {tab.label} {tab.count}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="expenses-stream">
                      {filteredExpenseFeed.length === 0 ? (
                        <div className="expenses-empty-state">
                          <strong>No expenses in this view yet.</strong>
                          <span>Try another filter or add a new expense.</span>
                        </div>
                      ) : (
                        filteredExpenseFeed.map((expense) => {
                          const isGroupExpense = expense.type === 'GROUP'
                          const groupName = expense.groupId ? (groups.find((group) => group.id === expense.groupId)?.name || 'Unknown group') : null
                          const isRecurring = !!(expense.isRecurring || expense.recurring)
                          const isSelected = expenseDetailView?.id === expense.id

                          return (
                            <article
                              key={expense.id}
                              className={isSelected ? 'expense-stream-card expense-stream-card-active' : 'expense-stream-card'}
                              onClick={() => setExpenseDetailView(expense)}
                            >
                              <div className="expense-stream-main">
                                <div className="expense-stream-icon">{isGroupExpense ? 'G' : 'P'}</div>
                                <div className="expense-stream-copy">
                                  <div className="expense-stream-topline">
                                    <strong>{expense.description}</strong>
                                    {expense.flaggedBy && expense.flaggedBy.length > 0 && (
                                      <span className="expense-flag-pill">Flagged {expense.flaggedBy.length}</span>
                                    )}
                                    {isRecurring && <span className="expense-recurring-pill">Recurring</span>}
                                  </div>
                                  <div className="expense-stream-meta">
                                    <span>{isGroupExpense ? (groupName || 'Group expense') : 'Personal expense'}</span>
                                    <span>{payerName(expense.payerId)}</span>
                                    {expense.createdAt && <span>{new Date(expense.createdAt).toLocaleDateString()}</span>}
                                  </div>
                                  <div className="expense-stream-support">
                                    {isGroupExpense ? (
                                      <>
                                        <span>{shareLabel(expense)}</span>
                                        {expense.payerId === currentUserId && (expense.participantIds || []).length > 1 && expense.expenseStatus !== 'Settled' && (
                                          <span className="positive">Others owe {getCurrencySymbol(expense.currency)}{othersOweTotal(expense).toFixed(2)}</span>
                                        )}
                                        {expense.payerId !== currentUserId && (expense.participantIds || []).includes(currentUserId) && !expense.settledByUser?.[currentUserId] && (
                                          <span className="negative">You owe {getCurrencySymbol(expense.currency)}{userShare(expense).toFixed(2)}</span>
                                        )}
                                      </>
                                    ) : (
                                      <span>{expense.imageUrl ? 'Bill attached' : 'No bill attached'}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="expense-stream-side">
                                <strong>{getCurrencySymbol(expense.currency)}{isGroupExpense ? userShare(expense).toFixed(2) : expense.amount.toFixed(2)}</strong>
                                <span className="muted">
                                  {isGroupExpense ? `your share of ${getCurrencySymbol(expense.currency)}${expense.amount.toFixed(2)}` : expense.currency}
                                </span>
                                <div className="expense-stream-actions">
                                  {isGroupExpense && expense.payerId !== currentUserId && (expense.participantIds || []).includes(currentUserId) && !expense.settledByUser?.[currentUserId] && (
                                    <button className="settle-btn" onClick={(event) => { event.stopPropagation(); handleSettleUp(expense.id) }}>Settle</button>
                                  )}
                                  {expense.createdBy === currentUserId && (
                                    <button onClick={(event) => { event.stopPropagation(); startEditExpense(expense); setShowExpenseModal(true) }}>Edit</button>
                                  )}
                                  {(expense.createdBy === currentUserId || (!expense.createdBy && expense.payerId === currentUserId)) && (
                                    <button onClick={(event) => { event.stopPropagation(); handleDeleteExpense(expense) }}>Delete</button>
                                  )}
                                </div>
                              </div>
                            </article>
                          )
                        })
                      )}
                    </div>
                  </section>
                </div>

                <aside className="panel expenses-detail-panel">
                  {expenseDetailView ? (
                    <>
                      <div className="expenses-detail-head">
                        <div>
                          <p className="expenses-detail-eyebrow">
                            {expenseDetailView.type === 'GROUP'
                              ? (groups.find((group) => group.id === expenseDetailView.groupId)?.name || 'Group expense')
                              : 'Personal expense'}
                          </p>
                          <h3>{expenseDetailView.description}</h3>
                        </div>
                        <div className="expenses-detail-amount">
                          <strong>{getCurrencySymbol(expenseDetailView.currency)}{expenseDetailView.amount.toFixed(2)}</strong>
                          <span>{expenseDetailView.currency}</span>
                        </div>
                      </div>

                      <div className="expenses-detail-summary">
                        <div className="expenses-detail-kv">
                          <span>Payer</span>
                          <strong>{payerName(expenseDetailView.payerId)}</strong>
                        </div>
                        <div className="expenses-detail-kv">
                          <span>Created</span>
                          <strong>{expenseDetailView.createdAt ? new Date(expenseDetailView.createdAt).toLocaleString() : 'Unknown'}</strong>
                        </div>
                        <div className="expenses-detail-kv">
                          <span>Status</span>
                          <strong>{expenseDetailView.expenseStatus || 'Open'}</strong>
                        </div>
                      </div>

                      {expenseDetailView.flaggedBy && expenseDetailView.flaggedBy.length > 0 && (
                        <div className="expenses-alert">
                          This expense has been flagged by {expenseDetailView.flaggedBy.length} participant{expenseDetailView.flaggedBy.length > 1 ? 's' : ''}.
                        </div>
                      )}

                      <div className="expenses-detail-actions">
                        {expenseDetailView.createdBy === currentUserId && (
                          <button type="button" onClick={() => { startEditExpense(expenseDetailView); setShowExpenseModal(true) }}>Edit expense</button>
                        )}
                        {(expenseDetailView.createdBy === currentUserId || (!expenseDetailView.createdBy && expenseDetailView.payerId === currentUserId)) && (
                          <button type="button" onClick={() => handleDeleteExpense(expenseDetailView)}>Delete</button>
                        )}
                        {expenseDetailView.createdBy !== currentUserId && (
                          expenseDetailView.flaggedBy?.includes(currentUserId) ? (
                            <button type="button" onClick={() => handleUnflagExpense(expenseDetailView.id)}>Unflag expense</button>
                          ) : (
                            <button type="button" onClick={() => handleFlagExpense(expenseDetailView.id)}>Flag expense</button>
                          )
                        )}
                        {expenseDetailView.groupId && expenseDetailView.payerId !== currentUserId && (expenseDetailView.participantIds || []).includes(currentUserId) && !expenseDetailView.settledByUser?.[currentUserId] && (
                          <button type="button" className="settle-btn" onClick={() => handleSettleUp(expenseDetailView.id)}>Settle up</button>
                        )}
                      </div>

                      {expenseDetailView.type === 'GROUP' && (
                        <div className="expenses-detail-section">
                          <h4>Split summary</h4>
                          <div className="expenses-detail-copy">
                            <div>{shareLabel(expenseDetailView)}</div>
                            {expenseDetailView.payerId === currentUserId && (expenseDetailView.participantIds || []).length > 1 && (
                              expenseDetailView.expenseStatus === 'Settled' ? (
                                <div className="settled-text">All settled</div>
                              ) : (
                                <div className="you-paid-info">Others owe you {getCurrencySymbol(expenseDetailView.currency)}{othersOweTotal(expenseDetailView).toFixed(2)}</div>
                              )
                            )}
                            {expenseDetailView.payerId !== currentUserId && (expenseDetailView.participantIds || []).includes(currentUserId) && (
                              expenseDetailView.settledByUser?.[currentUserId] ? (
                                <div className="settled-text">You already settled this expense.</div>
                              ) : (
                                <div className="owes-amount">You owe {getCurrencySymbol(expenseDetailView.currency)}{userShare(expenseDetailView).toFixed(2)}</div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {expenseDetailView.imageUrl && (
                        <div className="expenses-detail-section">
                          <h4>Attachment</h4>
                          <a href={expenseDetailView.imageUrl} target="_blank" rel="noreferrer">View bill</a>
                        </div>
                      )}

                      <div className="expenses-detail-section">
                        <h4>Edit history</h4>
                        {expenseEditLogs[expenseDetailView.id]?.length ? (
                          <>
                            <div className="expenses-history-list">
                              {expenseEditLogs[expenseDetailView.id]
                                .slice(0, editLogDisplayCount)
                                .map((log, idx) => (
                                  <div key={log.id || idx} className="expenses-history-item">
                                    <strong>{new Date(log.editTime).toLocaleString()}</strong>
                                    <span>{log.reason || 'Updated expense details'}</span>
                                  </div>
                                ))}
                            </div>
                            {expenseEditLogs[expenseDetailView.id].length > editLogDisplayCount && (
                              <button type="button" className="icon-btn" onClick={() => setEditLogDisplayCount(editLogDisplayCount + 3)}>See more</button>
                            )}
                          </>
                        ) : (
                          <div className="muted">No edits yet.</div>
                        )}
                      </div>

                      <div className="expenses-detail-section">
                        <h4>Expense chat</h4>
                        {expenseDetailView.groupId ? (
                          <div className="expense-chat-panel">
                            <div className="expense-chat-messages">
                              {(expenseChats[expenseDetailView.id] || []).length === 0 && <div className="muted">No messages yet.</div>}
                              {(expenseChats[expenseDetailView.id] || []).map((msg, idx) => (
                                <div key={idx} className="expense-chat-message">
                                  <span className={msg.user === currentUserName ? 'expense-chat-user expense-chat-user-self' : 'expense-chat-user'}>{msg.user}</span>
                                  <span>{msg.message}</span>
                                  <div className="muted" style={{ fontSize: '0.7rem' }}>{msg.timestamp}</div>
                                </div>
                              ))}
                            </div>
                            <div className="expense-chat-composer">
                              <input
                                type="text"
                                value={expenseChatInputs[expenseDetailView.id] || ''}
                                onChange={(event) => setExpenseChatInputs((prev) => ({ ...prev, [expenseDetailView.id]: event.target.value }))}
                                placeholder="Type a message..."
                                onKeyDown={(event) => { if (event.key === 'Enter') handleSendExpenseChatMessage(expenseDetailView.id) }}
                              />
                              <button type="button" onClick={() => handleSendExpenseChatMessage(expenseDetailView.id)} disabled={!(expenseChatInputs[expenseDetailView.id]?.trim())}>Send</button>
                            </div>
                          </div>
                        ) : (
                          <div className="muted">Expense chat is only available for group expenses.</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="expenses-placeholder">
                      <div className="expenses-placeholder-icon">[]</div>
                      <h3>Select an expense</h3>
                      <p className="muted">Click any expense from the list to open its breakdown, edit history, flag status, and expense chat.</p>
                    </div>
                  )}
                </aside>
              </div>
            </section>
          )}
          {/* ── Activity tab ── */}
          {activeTab === 'Activity' && (
            <section className="activity-shell">
              <div className="activity-hero panel">
                <div>
                  <p className="dashboard-breadcrumb">Finwise / Activity</p>
                  <h2>Activity</h2>
                  <p className="activity-subtitle">A complete list of your transactions and expense updates.</p>
                </div>
              </div>

              <div className="activity-stat-grid">
                <article className="panel activity-stat-card">
                  <span className="activity-stat-label">Total updates</span>
                  <strong className="activity-stat-value">{activityStats.total}</strong>
                  <span className="activity-stat-note">{activityStats.visible} visible with current filters</span>
                </article>
                <article className="panel activity-stat-card">
                  <span className="activity-stat-label">Expense updates</span>
                  <strong className="activity-stat-value positive">{activityStats.expenses}</strong>
                  <span className="activity-stat-note">Added or changed expense activity</span>
                </article>
                <article className="panel activity-stat-card">
                  <span className="activity-stat-label">Settlement activity</span>
                  <strong className="activity-stat-value negative">{activityStats.settlements}</strong>
                  <span className="activity-stat-note">Balances, dues, and settlement movement</span>
                </article>
              </div>

              <section className="panel activity-panel">
                <div className="activity-toolbar">
                  <div className="activity-filter-row">
                    {activityFilterTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        className={activityFilter === tab.key ? 'activity-filter-chip activity-filter-chip-active' : 'activity-filter-chip'}
                        onClick={() => setActivityFilter(tab.key)}
                      >
                        {tab.label} {tab.count}
                      </button>
                    ))}
                  </div>

                  <label className="activity-sort">
                    <span>Sort by</span>
                    <select value={activitySortOrder} onChange={(event) => setActivitySortOrder(event.target.value as ActivitySortOrder)}>
                      <option value="NEWEST">Newest first</option>
                      <option value="OLDEST">Oldest first</option>
                    </select>
                  </label>
                </div>

                <div className="activity-groups">
                  {activityGroups.length === 0 ? (
                    <div className="activity-empty-state">
                      <strong>No activity yet.</strong>
                      <span>Try a different filter or search term.</span>
                    </div>
                  ) : (
                    activityGroups.map((group) => (
                      <section key={group.key} className="activity-day-group">
                        <div className="activity-day-head">
                          <div className="activity-day-title">
                            <span className="activity-day-icon">DT</span>
                            <strong>{group.label}</strong>
                          </div>
                          <span className="muted">{group.items.length} updates</span>
                        </div>

                        <div className="activity-list">
                          {group.items.map((activity) => {
                            const tone = getActivityTone(activity)
                            const category = getActivityCategory(activity)
                            return (
                              <article key={activity.id} className="activity-row">
                                <div className={`activity-row-icon activity-row-icon-${tone}`}>
                                  {getActivityBadge(activity)}
                                </div>
                                <div className="activity-row-main">
                                  <strong>{activity.description}</strong>
                                  <span>{new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="activity-row-meta">
                                  <span className={`activity-category activity-category-${category.toLowerCase()}`}>{category.toLowerCase()}</span>
                                  <span className="muted">{formatRelativeTime(activity.createdAt)}</span>
                                </div>
                              </article>
                            )
                          })}
                        </div>
                      </section>
                    ))
                  )}
                </div>

                {activityHasMore && (
                  <div className="activity-load-more">
                    <button className="see-more-btn" onClick={async () => {
                      const nextPage = activityPage + 1;
                      setActivityPage(nextPage);
                      await fetchActivities(currentUserId, nextPage, true);
                    }}>Load more activity</button>
                  </div>
                )}
              </section>
            </section>
          )}

          {/* ── Account tab — daily spending bar chart ── */}
          {activeTab === 'Account' && (() => {
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
      <button className="fab" title="Add expense" onClick={() => {
        resetExpenseForm();
        setEditingExpense(null);
        setShowExpenseModal(true);
      }}>
        ＋
      </button>

      {/* ── Expense modal ── */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => {
          setShowExpenseModal(false);
          setEditingExpense(null);
          if (!editingExpense) resetExpenseForm();
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button className="modal-close" onClick={() => {
                setShowExpenseModal(false);
                setEditingExpense(null);
                if (!editingExpense) resetExpenseForm();
              }}>✕</button>
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

            {/* Expense Chat UI (only for editing existing expense) */}
            {editingExpense && (
              <div className="expense-chat-panel" style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                <h3>Expense Chat</h3>
                <div className="expense-chat-messages" style={{ maxHeight: 200, overflowY: 'auto', marginBottom: '1rem', background: '#222', padding: '0.5rem', borderRadius: 6 }}>
                  {(expenseChats[editingExpense.id] || []).length === 0 && <div className="muted">No messages yet.</div>}
                  {(expenseChats[editingExpense.id] || []).map((msg, idx) => (
                    <div key={idx} style={{ marginBottom: 8 }}>
                      <span style={{ fontWeight: msg.user === currentUserName ? 'bold' : 'normal', color: msg.user === currentUserName ? '#6cf' : '#fff' }}>{msg.user}:</span> <span>{msg.message}</span>
                      <div className="muted" style={{ fontSize: '0.7rem' }}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={expenseChatInputs[editingExpense.id] || ''}
                    onChange={e => setExpenseChatInputs(prev => ({ ...prev, [editingExpense.id]: e.target.value }))}
                    placeholder="Type a message..."
                    style={{ flex: 1 }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendExpenseChatMessage(editingExpense.id); }}
                  />
                  <button type="button" onClick={() => handleSendExpenseChatMessage(editingExpense.id)} disabled={!(expenseChatInputs[editingExpense.id]?.trim())}>Send</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Expense Detail Modal (top-level, always rendered) */}
      {/* The modal code should be placed back to its previous location inside the main content, e.g., after the group and personal expenses lists, not at the very end. */}
    </div>
  )
}

export default App
