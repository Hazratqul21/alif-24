import React, { useEffect, useState } from "react";
import { Star } from 'lucide-react';
import "./Harf.css";
import HarfModal from "./HarfModal";
import Navbar from '../components/Common/Navbar';
import GuestGuard from '../components/Common/GuestGuard';

// O‘zbek alifbosi + sonlar
const items = [
  // Harflar
  {
    label: "A a",
    image: "🐻",
    examples: [ "Ayiq", "Akula"],
    exampleImages: [ "🐻", "🦈"]
  },
  {
    label: "B b",
    image: "🍃",
    examples: ["Barg", "Baliq"],
    exampleImages: ["🍃", "🐟"]
  },
  { 
    label: "D d", 
    image: "📓",
    examples: [ "Dengiz", "Daftar"],
    exampleImages: [ "🌊", "📓"]
  },
  { 
    label: "E e", 
    image: "🚪",
    examples: ["Eshik", "Etik"],
    exampleImages: ["🚪", "🥾"]
  },
  { 
    label: "F f", 
    image: "🐘",
    examples: ["Fil", "Futbol"],
    exampleImages: ["🐘", "⚽️"]
  },
  { 
    label: "G g", 
    image: "🌸",
    examples: ["Gul", "Gilos"],
    exampleImages: ["🌸", "🍒"]
  },
  { 
    label: "H h", 
    image: "🔤",
    examples: ["Harf", "Hamkor"],
    exampleImages: ["🔤", "🤝"]
  },
  { 
    label: "I i", 
    image: "🐍",
    examples: ["Ilon", "Igna"],
    exampleImages: ["🐍", "🪡"]
  },
  { 
    label: "J j", 
    image: "🦒",
    examples: ["Jirafa", "Jahon"],
    exampleImages: ["🦒", "🌍"]
  },
  { 
    label: "K k", 
    image: "📚",
    examples: ["Kitob", "Kecha"],
    exampleImages: ["📚", "🌙"]
  },
  { 
    label: "L l", 
    image: "🌷",
    examples: ["Lola",  "Limon"],
    exampleImages: ["🌷", "🍋"]
  },
  { 
    label: "M m", 
    image: "🐈",
    examples: ["Mushuk", "Maktab"],
    exampleImages: ["🐈", "🏫"]
  },
  { 
    label: "N n", 
    image: "🍞",
    examples: ["Non", "Nok"],
    exampleImages: ["🍞", "🍐"]
  },
  { 
    label: "O o", 
    image: "🍎",
    examples: ["Olma", "Olov"],
    exampleImages: ["🍎", "🔥"]
  },
  { 
    label: "P p", 
    image: "🐼",
    examples: ["Pichoq", "Panda"],
    exampleImages: ["🔪", "🐼"]
  },
  { 
    label: "Q q", 
    image: "✏️",
    examples: ["Qalam",  "Qoʻzichoq"],
    exampleImages: ["✏️",  "🐑"]
  },
  { 
    label: "R r", 
    image: "🎨",
    examples: [ "Rang", "Rasm"],
    exampleImages: [ "🎨", "🖼️"]
  },
  { 
    label: "S s", 
    image: "🥕",
    examples: ["Sabzi",  "Sichqon"],
    exampleImages: ["🥕", "🐁"]
  },
  { 
    label: "T t", 
    image: "🐫",
    examples: ["Tuya", "Tuxum"],
    exampleImages: ["🐫", "🥚"]
  },
  { 
    label: "U u", 
    image: "🏠",
    examples: ["Uy", "Uzum"],
    exampleImages: ["🏠", "🍇"]
  },
  { 
    label: "V v", 
    image: "🏺",
    examples: ["Vaza", "Varrak"],
    exampleImages: ["🏺", "🪁"]
  },
  { 
    label: "X x", 
    image: "🗺️",
    examples: ["Xarita", "Xoʻroz"],
    exampleImages: ["🗺️", "🐓"]
  },
  { 
    label: "Y y", 
    image: "🐅",
    examples: ["Yoʻlbars", "yashin"],
    exampleImages: ["🐅", "⚡️"]
  },
  { 
    label: "Z z", 
    image: "🦓",
    examples: ["Zebra",  "Zamin"],
    exampleImages: ["🦓", "🌍"]
  },
  { 
    label: "Oʻ oʻ", 
    image: "🦆",
    examples: ["Oʻrdak", "Oʻrik"],
    exampleImages: ["🦆", "🍑"]
  },
  { 
    label: "Gʻ gʻ", 
    image: "🧱",
    examples: ["Gʻisht", "Gʻildirak"],
    exampleImages: ["🧱", "🎡"]
  },
  { 
    label: "Sh sh", 
    image: "🍑",
    examples: ["Shaftoli", "Shokolad"],
    exampleImages: ["🍑", "🍫"]
  },
  { 
    label: "Ch ch", 
    image: "🍵",
    examples: ["Choy", "Chumoli"],
    exampleImages: ["🍵", "🐜"]
  },
  { 
    label: "ng", 
    image: "🥒",
    examples: ["Bodiring", "Singil"],
    exampleImages: ["🥒",  "👧"]
  },
  { 
    label: "'", 
    image: "🎓",
    examples: ["Ta'lim",  "A'lo"],
    exampleImages: [ "🎓", "👍"]
  }
 
];

export default function Harf({ onBack }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Level progression: unlocked index stored in localStorage
  const [unlocked, setUnlocked] = useState(() => {
    try {
      const saved = localStorage.getItem("uz_harfProgressUnlocked");
      return saved ? parseInt(saved, 10) : 0; // 0 => faqat 1-chi (A) ochiq
    } catch {
      return 0;
    }
  });

  // Yulduzchalar state
  const [letterStars, setLetterStars] = useState(() => {
    try {
      const history = JSON.parse(localStorage.getItem('harfModal_starsHistory') || '[]');
      const starsMap = {};
      // Har bir harf uchun oxirgi olingan yulduzchalarni olish
      history.forEach(entry => {
        starsMap[entry.letter] = entry.stars;
      });
      return starsMap;
    } catch {
      return {};
    }
  });

  // localStorage o'zgarishlarini kuzatish
  useEffect(() => {
    const updateStars = () => {
      try {
        const history = JSON.parse(localStorage.getItem('harfModal_starsHistory') || '[]');
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
    try { localStorage.setItem("uz_harfProgressUnlocked", String(unlocked)); } catch {}
  }, [unlocked]);

  const handleCardClick = (card, index) => {
    if (index > unlocked) {
      // Locked level: ignore clicks
      return;
    }
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
    <GuestGuard contentType="harf" contentId="uzbek-alphabet">
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 3 + 's',
              animationDuration: Math.random() * 2 + 2 + 's'
            }}
          />
        ))}
      </div>
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
        );})}

      </div>

      <HarfModal 
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