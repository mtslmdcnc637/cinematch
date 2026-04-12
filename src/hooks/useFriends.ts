/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import { supabaseService } from '../services/supabaseService';
import { toast } from 'sonner';

interface FriendProfile {
  id: string;
  username?: string;
  avatar_url?: string;
  email?: string;
  [key: string]: unknown;
}

interface FriendRequest {
  id: string;
  status: string;
  user_id: string;
  profiles?: FriendProfile | FriendProfile[];
  [key: string]: unknown;
}

interface FriendWithProfile {
  id: string;
  username?: string;
  avatar_url?: string;
  [key: string]: unknown;
}

interface UseFriendsParams {
  user: { id: string } | null;
  currentPage: string;
}

interface UseFriendsReturn {
  friends: FriendWithProfile[];
  setFriends: Dispatch<SetStateAction<FriendWithProfile[]>>;
  friendRequests: FriendRequest[];
  setFriendRequests: Dispatch<SetStateAction<FriendRequest[]>>;
  searchUserQuery: string;
  setSearchUserQuery: (query: string) => void;
  userSearchResults: FriendProfile[];
  isSearchingUsers: boolean;
  showAddFriendModal: boolean;
  setShowAddFriendModal: (show: boolean) => void;
  handleSearchUsers: () => Promise<void>;
  handleSendRequest: (friendId: string) => Promise<void>;
  handleRespondRequest: (requestId: string, status: 'accepted' | 'declined') => Promise<void>;
}

export function useFriends({ user, currentPage }: UseFriendsParams): UseFriendsReturn {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<FriendProfile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  // Fetch friends and requests when on friends page
  useEffect(() => {
    if (user && currentPage === 'friends') {
      supabaseService.getFriends(user.id)
        .then(data => setFriends(data as FriendWithProfile[]))
        .catch(() => {});
      supabaseService.getFriendRequests(user.id)
        .then(data => setFriendRequests(data as FriendRequest[]))
        .catch(() => {});
    }
  }, [user, currentPage]);

  const handleSearchUsers = useCallback(async () => {
    if (searchUserQuery.trim().length < 3) return;
    setIsSearchingUsers(true);
    try {
      const results = await supabaseService.searchUsers(searchUserQuery);
      setUserSearchResults(results.filter(u => u.id !== user?.id) as FriendProfile[]);
    } catch {
      toast.error('Erro ao buscar usuários');
    } finally {
      setIsSearchingUsers(false);
    }
  }, [searchUserQuery, user]);

  const handleSendRequest = useCallback(
    async (friendId: string) => {
      try {
        await supabaseService.sendFriendRequest(user!.id, friendId);
        toast.success('Solicitação enviada!');
        setUserSearchResults(prev => prev.filter(u => u.id !== friendId));
      } catch {
        toast.error('Erro ao enviar solicitação');
      }
    },
    [user]
  );

  const handleRespondRequest = useCallback(
    async (requestId: string, status: 'accepted' | 'declined') => {
      try {
        await supabaseService.respondToFriendRequest(requestId, status);
        setFriendRequests(prev => prev.filter(r => r.id !== requestId));
        if (status === 'accepted') {
          const newFriends = await supabaseService.getFriends(user!.id);
          setFriends(newFriends as FriendWithProfile[]);
          toast.success('Solicitação aceita!');
        } else {
          toast('Solicitação recusada');
        }
      } catch {
        toast.error('Erro ao responder solicitação');
      }
    },
    [user]
  );

  return {
    friends,
    setFriends,
    friendRequests,
    setFriendRequests,
    searchUserQuery,
    setSearchUserQuery,
    userSearchResults,
    isSearchingUsers,
    showAddFriendModal,
    setShowAddFriendModal,
    handleSearchUsers,
    handleSendRequest,
    handleRespondRequest,
  };
}
