import React, { useState, useEffect } from 'react';
import { fetchMovieTrailers } from '../services/tmdbService';
import { supabaseService } from '../services/supabaseService';
import { motion } from 'framer-motion';
import { Play, X } from 'lucide-react';

interface StoryItem {
  movie_id: number;
  movie_data: any;
  timestamp: string;
  trailer: any;
}

interface UserStories {
  user_id: string;
  username: string;
  items: StoryItem[];
}

export const Stories = ({ userId }: { userId: string }) => {
  const [userStories, setUserStories] = useState<UserStories[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);

  useEffect(() => {
    const loadStories = async () => {
      const recentRatings = await supabaseService.getRecentFriendRatings(userId);
      const storiesData = await Promise.all(
        recentRatings.map(async (r) => {
          const trailers = await fetchMovieTrailers(r.movie_id);
          return {
            ...r,
            trailer: trailers[0]
          };
        })
      );
      
      const filteredStories = storiesData.filter(s => s.trailer);
      
      // Group by user
      const grouped = filteredStories.reduce((acc, story) => {
        const uId = story.user_id;
        if (!acc[uId]) {
          acc[uId] = {
            user_id: uId,
            username: story.profiles && story.profiles.length > 0 ? story.profiles[0].username : 'Amigo',
            items: []
          };
        }
        acc[uId].items.push(story);
        return acc;
      }, {} as Record<string, UserStories>);

      setUserStories(Object.values(grouped));
    };
    loadStories();
  }, [userId]);

  // Auto-advance timer
  useEffect(() => {
    if (activeGroupIndex === null) return;
    
    const timer = setTimeout(() => {
      handleNext();
    }, 15000); // 15 seconds per story
    
    return () => clearTimeout(timer);
  }, [activeGroupIndex, activeStoryIndex]);

  const handleNext = () => {
    if (activeGroupIndex === null) return;
    const currentGroup = userStories[activeGroupIndex];
    
    if (activeStoryIndex < currentGroup.items.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
    } else if (activeGroupIndex < userStories.length - 1) {
      setActiveGroupIndex(prev => prev + 1);
      setActiveStoryIndex(0);
    } else {
      closeViewer();
    }
  };

  const handlePrev = () => {
    if (activeGroupIndex === null) return;
    
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
    } else if (activeGroupIndex > 0) {
      setActiveGroupIndex(prev => prev - 1);
      setActiveStoryIndex(userStories[activeGroupIndex - 1].items.length - 1);
    } else {
      setActiveStoryIndex(0);
    }
  };

  const closeViewer = () => {
    setActiveGroupIndex(null);
    setActiveStoryIndex(0);
  };

  if (userStories.length === 0) return null;

  return (
    <div className="flex gap-4 overflow-x-auto py-4 px-6 no-scrollbar">
      {userStories.map((group, index) => (
        <button
          key={group.user_id}
          onClick={() => {
            setActiveGroupIndex(index);
            setActiveStoryIndex(0);
          }}
          className="flex-shrink-0 w-20 flex flex-col items-center gap-2"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5">
            <img 
              src={`https://image.tmdb.org/t/p/w200${group.items[0].movie_data.poster_path}`} 
              className="w-full h-full rounded-full object-cover border-2 border-[#030303]"
              alt={group.username}
            />
          </div>
          <span className="text-xs text-gray-300 truncate w-full text-center">{group.username}</span>
        </button>
      ))}

      {activeGroupIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          {/* Progress Bars */}
          <div className="absolute top-4 left-4 right-4 flex gap-1 z-50">
            {userStories[activeGroupIndex].items.map((_, idx) => (
              <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white"
                  style={{ 
                    width: idx < activeStoryIndex ? '100%' : idx > activeStoryIndex ? '0%' : '100%',
                    animation: idx === activeStoryIndex ? 'storyProgress 15s linear forwards' : 'none'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header (User Info & Close) */}
          <div className="absolute top-8 left-4 right-4 flex justify-between items-center z-50">
            <div className="flex items-center gap-3">
              <img 
                src={`https://image.tmdb.org/t/p/w200${userStories[activeGroupIndex].items[0].movie_data.poster_path}`} 
                className="w-10 h-10 rounded-full object-cover border border-white/50"
                alt="Avatar"
              />
              <div className="flex flex-col items-start">
                <span className="text-white font-semibold text-sm drop-shadow-md">
                  {userStories[activeGroupIndex].username}
                </span>
                <span className="text-white/70 text-xs drop-shadow-md">
                  assistiu {userStories[activeGroupIndex].items[activeStoryIndex].movie_data.title}
                </span>
              </div>
            </div>
            <button onClick={closeViewer} className="p-2 text-white/80 hover:text-white drop-shadow-md">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content (YouTube iframe) */}
          <div className="flex-1 relative flex items-center justify-center bg-black">
            {/* Left Click Area (30% width) */}
            <div 
              className="absolute top-0 bottom-0 left-0 w-[30%] z-40 cursor-pointer"
              onClick={handlePrev}
            />
            
            {/* Right Click Area (30% width) */}
            <div 
              className="absolute top-0 bottom-0 right-0 w-[30%] z-40 cursor-pointer"
              onClick={handleNext}
            />

            <div className="w-full h-full max-w-md mx-auto flex items-center justify-center relative">
              <iframe
                key={`${activeGroupIndex}-${activeStoryIndex}`}
                className="w-full aspect-video"
                src={`https://www.youtube.com/embed/${userStories[activeGroupIndex].items[activeStoryIndex].trailer.key}?autoplay=1&controls=0&modestbranding=1&rel=0&playsinline=1`}
                title="Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
          
          <style>{`
            @keyframes storyProgress {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};
