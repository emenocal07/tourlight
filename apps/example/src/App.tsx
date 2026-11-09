import type { TourVariant } from "@emenocal07/tourlight";
import { useState } from "react";
import { STORAGE_KEY, TourProvider, TourStep, useTour } from "./tour";

const VARIANTS: TourVariant[] = ["glass", "minimal", "bold"];
const CATEGORIES = ["All", "Books", "Music", "Film"];
const CARDS = Array.from({ length: 9 }, (_, i) => `Item ${i + 1}`);

function Controls(props: {
  variant: TourVariant;
  onVariant: (variant: TourVariant) => void;
  primary: string;
  onPrimary: (color: string) => void;
}) {
  const tour = useTour();
  return (
    <div className="controls">
      <label>
        Variant{" "}
        <select
          value={props.variant}
          onChange={(e) => props.onVariant(e.target.value as TourVariant)}
        >
          {VARIANTS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Primary color{" "}
        <input
          type="color"
          value={props.primary}
          onChange={(e) => props.onPrimary(e.target.value)}
        />
      </label>
      <button type="button" onClick={() => tour.start()}>
        Restart tour
      </button>
      <button
        type="button"
        onClick={() => {
          localStorage.removeItem(STORAGE_KEY);
          location.reload();
        }}
      >
        Reset saved progress
      </button>
    </div>
  );
}

export function App() {
  const [variant, setVariant] = useState<TourVariant>("glass");
  const [primary, setPrimary] = useState("#6366f1");

  return (
    <TourProvider variant={variant} theme={{ primary }}>
      <main>
        <h1>Tourlight playground</h1>
        <Controls
          variant={variant}
          onVariant={setVariant}
          primary={primary}
          onPrimary={setPrimary}
        />
        <TourStep id="search">
          <input
            className="search"
            type="search"
            placeholder="Search the library"
          />
        </TourStep>
        <div className="spacer">Scroll down</div>
        <TourStep id="filters">
          <select className="filters" defaultValue="All">
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </TourStep>
        <div className="spacer tall">Keep scrolling</div>
        <TourStep id="library">
          <ul className="grid">
            {CARDS.map((c) => (
              <li key={c} className="card">
                {c}
              </li>
            ))}
          </ul>
        </TourStep>
        <div className="spacer">End of page</div>
      </main>
    </TourProvider>
  );
}
