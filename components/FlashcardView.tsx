import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';

interface FlashcardViewProps {
  flashcards: Flashcard[];
}

const FlashcardItem: React.FC<{ card: Flashcard }> = ({ card }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (isFlipped) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 6000); // Card disappears after 6 seconds
      return () => clearTimeout(timer);
    }
  }, [isFlipped]);

  const handleFlip = () => {
    if (!isFlipped) { // Prevent flipping back and re-triggering the timer
      setIsFlipped(true);
    }
  };

  return (
    <div
      className={`perspective-1000 transition-all duration-500 ease-in-out ${!isVisible ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
      onClick={handleFlip}
    >
      <div
        className={`relative w-full h-64 transform-style-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''
          }`}
      >
        <div className="absolute w-full h-full backface-hidden bg-gray-700 rounded-lg p-6 flex items-center justify-center text-center">
          <div>
            <p className="text-sm text-gray-400 mb-2">QUESTION</p>
            <p className="text-xl">{card.question}</p>
          </div>
        </div>
        <div className="absolute w-full h-full backface-hidden bg-blue-600 rounded-lg p-6 flex items-center justify-center text-center rotate-y-180">
          <div>
            <p className="text-sm text-blue-200 mb-2">ANSWER</p>
            <p className="text-xl">{card.answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FlashcardView: React.FC<FlashcardViewProps> = ({ flashcards }) => {
  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Generated Flashcards</h2>
      </div>

      {flashcards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {flashcards.map((card) => (
            <FlashcardItem key={card.id} card={card} />
          ))}
        </div>
      ) : (
        <p className="text-gray-400">No flashcards generated yet.</p>
      )}
    </div>
  );
};

// Add custom styles for 3D transform
const style = document.createElement('style');
style.textContent = `
  .perspective-1000 { perspective: 1000px; }
  .transform-style-3d { transform-style: preserve-3d; }
  .rotate-y-180 { transform: rotateY(180deg); }
  .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
`;
document.head.append(style);

export default FlashcardView;
