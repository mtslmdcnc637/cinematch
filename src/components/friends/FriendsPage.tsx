/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, User, Check, X, Search, RefreshCw, Sparkles } from 'lucide-react';
import { Stories } from '../Stories';

interface FriendsPageProps {
  friends: any[];
  friendRequests: any[];
  searchUserQuery: string;
  setSearchUserQuery: (query: string) => void;
  userSearchResults: any[];
  isSearchingUsers: boolean;
  handleSearchUsers: () => void;
  handleSendRequest: (friendId: string) => void;
  handleRespondRequest: (requestId: string, status: 'accepted' | 'declined') => void;
  handleGroupExportForAI: () => void;
  showAddFriendModal: boolean;
  setShowAddFriendModal: (show: boolean) => void;
  selectedFriends: string[];
  setSelectedFriends: (friends: string[]) => void;
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  isPro: boolean;
  userId?: string;
}

export const FriendsPage: React.FC<FriendsPageProps> = ({
  friends,
  friendRequests,
  searchUserQuery,
  setSearchUserQuery,
  userSearchResults,
  isSearchingUsers,
  handleSearchUsers,
  handleSendRequest,
  handleRespondRequest,
  handleGroupExportForAI,
  showAddFriendModal,
  setShowAddFriendModal,
  selectedFriends,
  setSelectedFriends,
  showExportModal,
  setShowExportModal,
  isPro,
  userId,
}) => {
  return (
    <motion.div
      key="friends"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto w-full"
    >
      <div className="text-center mb-10">
        <Users className="w-16 h-16 text-purple-500 mx-auto mb-4" />
        <h2 className="text-4xl font-bold font-display mb-2">Match de Sofá</h2>
        <p className="text-gray-400">Selecione quem vai assistir com você para encontrarmos o filme perfeito para o grupo.</p>
      </div>

      {userId && <Stories userId={userId} />}

      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-400" />
            Solicitações Pendentes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friendRequests.map(request => (
              <div key={request.id} className="glass-card p-4 rounded-2xl flex items-center gap-4 border-purple-500/30 bg-purple-500/5">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white">{request.profiles.username || 'Usuário'}</h4>
                  <p className="text-xs text-gray-400">Quer ser seu amigo</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondRequest(request.id, 'accepted')}
                    className="p-2 bg-emerald-500/20 text-emerald-400 rounded-full hover:bg-emerald-500/30 transition-colors"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleRespondRequest(request.id, 'declined')}
                    className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {friends.length === 0 ? (
          <div className="md:col-span-2 py-12 text-center glass-card rounded-2xl border-dashed border-white/10">
            <p className="text-gray-500 mb-4">Você ainda não tem amigos adicionados.</p>
          </div>
        ) : (
          friends.map(friend => (
            <div
              key={friend.id}
              onClick={() => {
                if (selectedFriends.includes(friend.id)) {
                  setSelectedFriends(selectedFriends.filter(id => id !== friend.id));
                } else {
                  setSelectedFriends([...selectedFriends, friend.id]);
                }
              }}
              className={`glass-card p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all ${selectedFriends.includes(friend.id) ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:bg-white/5'}`}
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                {friend.avatar_url ? (
                  <img src={friend.avatar_url} alt={friend.username} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white">{friend.username || 'Amigo'}</h4>
                <p className="text-xs text-gray-400">Amigo</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedFriends.includes(friend.id) ? 'border-purple-500 bg-purple-500' : 'border-gray-500'}`}>
                {selectedFriends.includes(friend.id) && <Check className="w-4 h-4 text-white" />}
              </div>
            </div>
          ))
        )}

        <button
          onClick={() => setShowAddFriendModal(true)}
          className="glass-card p-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer border-dashed border-white/20 hover:bg-white/5 transition-all text-gray-400 hover:text-white"
        >
          <UserPlus className="w-5 h-5" />
          <span className="font-medium">Adicionar Amigo</span>
        </button>
      </div>

      <div className="glass-card p-8 rounded-[2rem] text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 pointer-events-none" />
        <h3 className="text-2xl font-bold mb-2 font-display">Resolver Conflito</h3>
        <p className="text-gray-400 text-sm mb-6">
          A IA vai analisar o gosto de todos os selecionados e encontrar o filme perfeito que vai agradar todo mundo.
        </p>
        <button
          onClick={handleGroupExportForAI}
          disabled={selectedFriends.length === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-full hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-5 h-5" />
          Gerar Acordo de Paz (Prompt)
        </button>
      </div>

      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddFriendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowAddFriendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1a1a2e] border border-white/10 p-8 rounded-[2rem] max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                  <UserPlus className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-display">Adicionar Amigo</h3>
                  <p className="text-gray-400 text-sm">Busque por nome de usuário ou e-mail</p>
                </div>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <button
                  onClick={handleSearchUsers}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors"
                >
                  <Search className="w-5 h-5 text-white" />
                </button>
                <input
                  type="text"
                  placeholder="Ex: joaosilva ou joao@email.com"
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-14 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {isSearchingUsers ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mx-auto" />
                  </div>
                ) : userSearchResults.length > 0 ? (
                  userSearchResults.map(result => (
                    <div key={result.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{result.username || 'Usuário'}</p>
                        <p className="text-xs text-gray-500 truncate">{result.email || ''}</p>
                      </div>
                      <button
                        onClick={() => handleSendRequest(result.id)}
                        className="p-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600 hover:text-white transition-all"
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                ) : searchUserQuery.length > 2 ? (
                  <p className="text-center text-gray-500 py-4">Nenhum usuário encontrado.</p>
                ) : (
                  <p className="text-center text-gray-500 py-4">Digite pelo menos 3 caracteres.</p>
                )}
              </div>

              <button
                onClick={() => setShowAddFriendModal(false)}
                className="w-full mt-8 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
