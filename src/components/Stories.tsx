import React, { useState, useEffect } from 'react';
import { fetchMovieTrailers } from '../services/tmdbService';
import { supabaseService } from '../services/supabaseService';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';

export const Stories = ({ userId }: { userId: string }) => {
  const [stories, setStories] = useState<any[]>([]);
  const [activeStory, setActiveStory] = useState<any | null>(null);

  useEffect(() => {
    const loadStories = async () => {
      const recentRatings = await supabaseService.getRecentFriendRatings(userId);
      console.log("Recent ratings:", recentRatings);
      const storiesData = await Promise.all(
        recentRatings.map(async (r) => {
          const trailers = await fetchMovieTrailers(r.movie_id);
          console.log("Trailers for", r.movie_id, trailers);
          return {
            ...r,
            trailer: trailers[0]
          };
        })
      );
      const filteredStories = storiesData.filter(s => s.trailer);
      console.log("Filtered stories:", filteredStories);
      setStories(filteredStories);
    };
    loadStories();
  }, [userId]);

  if (stories.length === 0) return null;

  return (
    <div className="flex gap-4 overflow-x-auto py-4 px-6 no-scrollbar">
      {stories.map((story) => (
        <button
          key={`${story.user_id}-${story.movie_id}`}
          onClick={() => setActiveStory(story)}
          className="flex-shrink-0 w-20 flex flex-col items-center gap-2"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5">
            <img 
              src={`https://image.tmdb.org/t/p/w200${story.movie_data.poster_path}`} 
              className="w-full h-full rounded-full object-cover border-2 border-[#030303]"
              alt={story.movie_data.title}
            />
          </div>
          <span className="text-xs text-gray-300 truncate w-full text-center">{story.profiles && story.profiles.length > 0 ? story.profiles[0].username : 'Amigo'}</span>
        </button>
      ))}

      {activeStory && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4" onClick={() => setActiveStory(null)}>
          <div className="w-full max-w-2xl aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${activeStory.trailer.key}?autoplay=1`}
              title="Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};
