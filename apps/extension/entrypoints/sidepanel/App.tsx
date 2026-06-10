import React, { useState } from 'react';
import ParseView from './views/ParseView';
import ReviewView from './views/ReviewView';

type View = 'parse' | 'review';

export default function App() {
  const [view, setView] = useState<View>('parse');

  return (
    <div>
      <nav>
        <button
          onClick={() => setView('parse')}
          aria-current={view === 'parse' ? 'page' : undefined}
        >
          Parse
        </button>
        <button
          onClick={() => setView('review')}
          aria-current={view === 'review' ? 'page' : undefined}
        >
          Review
        </button>
      </nav>
      {view === 'parse' ? <ParseView /> : <ReviewView />}
    </div>
  );
}
