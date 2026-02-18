import React, { useEffect, useState } from "react";
import { Star } from 'lucide-react';
import "./Harfr.css";
import HarfrModal from "./HarfrModal";
import Navbar from '../components/Common/Navbar';
import GuestGuard from '../components/Common/GuestGuard';

// Русский алфавит
const items = [
  { label: "А а", image: "🍉", 
    examples: ["Арбуз", "Автобус"], 
    exampleImages: ["🍉", "🚌"] },
  { label: "Б б", image: "🐑", 
    examples: ["Баран", "Банан"], 
    exampleImages: ["🐑", "🍌"] },
  { label: "В в", image: "🚲", 
    examples: ["Велосипед", "Волк"], 
    exampleImages: ["🚲", "🐺"] },
  { label: "Г г", image: "🎸", 
    examples: ["Гитара", "Гусь"], 
    exampleImages: ["🎸", "🦢"] },
  { label: "Д д", image: "🏠", 
    examples: ["Дом", "Дерево"], 
    exampleImages: ["🏠", "🌳"] },
  { label: "Е е", image: "🦝", 
    examples: ["Енот", "Еда"], 
    exampleImages: ["🦝", "🍽️"] },
  { label: "Ё ё", image: "🦔", 
    examples: ["Ёж", "Ёлка"], 
    exampleImages: ["🦔", "🎄"] },
  { label: "Ж ж", image: "🦒", 
    examples: ["Жираф", "Жук"], 
    exampleImages: ["🦒", "🪲"] },
  { label: "З з", image: "☂️", 
    examples: ["Зонт", "Звезда"],
     exampleImages: ["☂️", "⭐"] },
  { label: "И и", image: "🎮", 
    examples: ["Игра", "Индюк"], 
    exampleImages: ["🎮", "🦃"] },
  { label: "Й й", image: "🥛", 
    examples: ["Йогурт", "Йога"], 
    exampleImages: ["🥛", "🧘‍♂️"] },
  { label: "К к", image: "📚", 
    examples: ["Котёнок", "Книга"], 
    exampleImages: ["🐈", "📖"] },
  { label: "Л л", image: "🌷",
    examples: ["Лиса", "Лимон"], 
    exampleImages: ["🦊", "🍋"] },
  { label: "М м", image: "🧸",
     examples: ["Медведь", "Мандарин"], 
     exampleImages: ["🧸", "🍊"] },
  { label: "Н н", image: "🦏", 
    examples: ["Носорог", "Носки"],
     exampleImages: ["🦏", "🧦"] },
  { label: "О о", image: "🫏", 
    examples: ["Осёл", "Очки"], 
    exampleImages: ["🫏", "🕶"] },
  { label: "П п", image: "🦜", 
    examples: ["Попугай", "Пирог"], 
    exampleImages: ["🦜", "🥧"] },
  { label: "Р р", image: "Р",
     examples: ["Рыба", "Ручка"],
      exampleImages: ["🐠", "🖊"] },
  { label: "С с", image: "❄️", 
    examples: ["Снег", "Солнце"], 
    exampleImages: ["❄️", "☀️"] },
  { label: "Т т", image: "🐅", 
    examples: ["Тигр", "Торт"], 
    exampleImages: ["🐅", "🎂"] },
  { label: "У у", image: "🦆", 
    examples: ["Утка", "Удочка"], 
    exampleImages: ["🦆", "🎣"] },
  { label: "Ф ф", image: "🏳️", 
    examples: ["Флаг", "Фонарь"],
     exampleImages: ["🏳️", "🏮"] },
  { label: "Х х", image: "🍞", 
    examples: ["Хлеб", "Хомяк"], 
    exampleImages: ["🍞", "🐹"] },
  { label: "Ц ц", image: "🎪", 
    examples: ["Цирк", "Цветок"], 
    exampleImages: ["🎪", "🌸"] },
  { label: "Ч ч", image: "🍵", 
    examples: ["Чай", "Часы"], 
    exampleImages: ["🍵", "⌚"] },
  { label: "Ш ш", image: "🎈", 
    examples: ["Шар", "Школа"],
     exampleImages: ["🎈", "🏫"] },
  { label: "Щ щ", image: "🐟", 
    examples: ["Щука", "Щётка"], 
    exampleImages: ["🐟", "🪥"] },
  { label: "Ъ ъ", image: "📦", 
    examples: ["объём", "съёмка"], 
    exampleImages: ["📦", "🎥"] },
  { label: "Ы ы", image: "🧀", 
    examples: ["сыр", "мышь"], 
    exampleImages: ["🧀", "🐭"] },
  { label: "Ь ь", image: "🧊", 
    examples: ["льды", "медаль"], 
    exampleImages: ["🧊", "🥇"] },
  { label: "Э э", image: "🖥️", 
    examples: ["Экран", "Эхо"], 
    exampleImages: ["🖥️", "🔊"] },
  { label: "Ю ю", image: "🛖",
     examples: ["Юрта", "Юмор"], 
     exampleImages: ["🛖", "🤣"] },
  { label: "Я я", image: "🍎", 
    examples: ["Яблоко", "Якорь"], 
    exampleImages: ["🍎", "⚓"] },
];

export default function Harfr({ onBack }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Прогресс уровня: сохраненный индекс в localStorage
  const [unlocked, setUnlocked] = useState(() => {
    try {
      const saved = localStorage.getItem("ru_harfProgressUnlocked");
      return saved ? parseInt(saved, 10) : 0; // 0 => только 1-я (А) открыта
    } catch {
      return 0;
    }
  });

  // Yulduzchalar state
  const [letterStars, setLetterStars] = useState(() => {
    try {
      const history = JSON.parse(localStorage.getItem('harfrModal_starsHistory') || '[]');
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
        const history = JSON.parse(localStorage.getItem('harfrModal_starsHistory') || '[]');
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
    try { localStorage.setItem("ru_harfProgressUnlocked", String(unlocked)); } catch {}
  }, [unlocked]);

  const handleCardClick = (card, index) => {
    if (index > unlocked) {
      // Заблокированный уровень: игнорировать клики
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
    <GuestGuard contentType="rharf" contentId="russian-alphabet">
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

      <HarfrModal 
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