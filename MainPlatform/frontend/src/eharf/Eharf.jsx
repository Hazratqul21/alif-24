import React, { useEffect, useState } from "react";
import { Star } from 'lucide-react';
import "../harf/Harf.css";
import EharfModal from "./EharfModal";
import Navbar from '../components/Common/Navbar';
import GuestGuard from '../components/Common/GuestGuard';

// English alphabet (A-Z)
const items = [
  { label: "A a", image: "🍎", examples: ["Apple", "Airplane"], exampleImages: ["🍎", "✈️"] },
  { label: "B b", image: "⚽", examples: ["Ball", "Banana"], exampleImages: ["⚽", "🍌"] },
  { label: "C c", image: "🐱", examples: ["Cat", "Car"], exampleImages: ["🐱", "🚗"] },
  { label: "D d", image: "🐶", examples: ["Dog", "Drum"], exampleImages: ["🐶", "🥁"] },
  { label: "E e", image: "🥚", examples: ["Egg", "Elephant"], exampleImages: ["🥚", "🐘"] },
  { label: "F f", image: "🐟", examples: ["Fish", "Flower"], exampleImages: ["🐟", "🌸"] },
  { label: "G g", image: "🎸", examples: ["Guitar", "Grapes"], exampleImages: ["🎸", "🍇"] },
  { label: "H h", image: "🏠", examples: ["House", "Hat"], exampleImages: ["🏠", "🎩"] },
  { label: "I i", image: "🍦", examples: ["Ice cream", "Igloo"], exampleImages: ["🍦", "🧊"] },
  { label: "J j", image: "🧃", examples: ["Juice", "Jelly"], exampleImages: ["🧃", "🍮"] },
  { label: "K k", image: "🔑", examples: ["Key", "Kite"], exampleImages: ["🔑", "🪁"] },
  { label: "L l", image: "🦁", examples: ["Lion", "Lemon"], exampleImages: ["🦁", "🍋"] },
  { label: "M m", image: "🐭", examples: ["Mouse", "Moon"], exampleImages: ["🐭", "🌙"] },
  { label: "N n", image: "🪺", examples: ["Nest", "Nose"], exampleImages: ["🪺", "👃"] },
  { label: "O o", image: "🐙", examples: ["Octopus", "Orange"], exampleImages: ["🐙", "🍊"] },
  { label: "P p", image: "🍕", examples: ["Pizza", "Panda"], exampleImages: ["🍕", "🐼"] },
  { label: "Q q", image: "👑", examples: ["Queen", "Question"], exampleImages: ["👑", "❓"] },
  { label: "R r", image: "🌈", examples: ["Rainbow", "Robot"], exampleImages: ["🌈", "🤖"] },
  { label: "S s", image: "☀️", examples: ["Sun", "Star"], exampleImages: ["☀️", "⭐"] },
  { label: "T t", image: "🐯", examples: ["Tiger", "Train"], exampleImages: ["🐯", "🚆"] },
  { label: "U u", image: "☂️", examples: ["Umbrella", "Unicorn"], exampleImages: ["☂️", "🦄"] },
  { label: "V v", image: "🎻", examples: ["Violin", "Volcano"], exampleImages: ["🎻", "🌋"] },
  { label: "W w", image: "🌊", examples: ["Water", "Whale"], exampleImages: ["🌊", "🐋"] },
  { label: "X x", image: "🩻", examples: ["X-ray", "Xylophone"], exampleImages: ["🩻", "🎼"] },
  { label: "Y y", image: "🪀", examples: ["Yo-yo", "Yellow"], exampleImages: ["🪀", "💛"] },
  { label: "Z z", image: "🦓", examples: ["Zebra", "Zoo"], exampleImages: ["🦓", "🦁"] },
];

export default function Eharf() {
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [unlocked, setUnlocked] = useState(() => {
    try {
      const saved = localStorage.getItem("en_harfProgressUnlocked");
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [letterStars, setLetterStars] = useState(() => {
    try {
      const history = JSON.parse(localStorage.getItem('eharfModal_starsHistory') || '[]');
      const starsMap = {};
      history.forEach(entry => {
        starsMap[entry.letter] = entry.stars;
      });
      return starsMap;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const updateStars = () => {
      try {
        const history = JSON.parse(localStorage.getItem('eharfModal_starsHistory') || '[]');
        const starsMap = {};
        history.forEach(entry => {
          starsMap[entry.letter] = entry.stars;
        });
        setLetterStars(starsMap);
      } catch {}
    };

    const interval = setInterval(updateStars, 2000);
    window.addEventListener('storage', updateStars);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updateStars);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem("en_harfProgressUnlocked", String(unlocked)); } catch {}
  }, [unlocked]);

  const handleCardClick = (card, index) => {
    if (index > unlocked) return;
    setSelectedIndex(index);
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
    setSelectedIndex(-1);
  };

  const markCompleted = () => {
    if (selectedIndex >= 0) {
      setUnlocked(prev => Math.max(prev, selectedIndex + 1));
    }
    closeModal();
  };

  return (
    <GuestGuard contentType="eharf" contentId="english-alphabet">
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] relative">
        <Navbar />

        <div className="harf-container">
          {items.map((item, index) => {
            const status = index < unlocked ? "completed" : (index === unlocked ? "current" : "locked");
            const parts = item.label.split(' ');
            const bigLetter = parts[0];
            const smallLetter = parts.length > 1 ? parts[1] : parts[0];
            const stars = letterStars[item.label] || 0;

            return (
              <div
                key={index}
                className={`harf-card level ${status}`}
                onClick={() => handleCardClick(item, index)}
              >
                <div className="harf-big-letter">{bigLetter}</div>
                <div className="harf-letter">{item.image}</div>
                <div className="harf-small-letter">{smallLetter}</div>

                {stars > 0 && (
                  <div className="level-stars">
                    {[...Array(stars)].map((_, idx) => (
                      <Star
                        key={idx}
                        className="level-star-icon"
                        fill="#FFD700"
                        color="#FFD700"
                        size={16}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <EharfModal
          isOpen={isModalOpen}
          onClose={closeModal}
          card={selectedCard}
          onAskStateChange={() => { /* noop */ }}
          onComplete={markCompleted}
        />
      </div>
    </GuestGuard>
  );
}
