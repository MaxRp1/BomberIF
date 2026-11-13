import { css } from 'styled-components'

// Identidade visual 8-bit do BomberIF.
// Sombras em degraus (sem blur) para imitar botões de sprites, sem usar PNGs
// que perderiam nitidez em telas de proporções diferentes.
export const pixelFont = "'Press Start 2P', 'Courier New', monospace"

export const retroPanel = css`
  background: #1e202b;
  border: 3px solid #1c101b;
  border-radius: 0;
  clip-path: none;
  box-shadow:
    inset 0 0 0 3px #67483d,
    inset 0 5px 0 #343d47,
    0 5px 0 #100c15;
  color: #ffe7b8;
`

export const retroInset = css`
  background: #292837;
  border: 2px solid #110f19;
  border-radius: 0;
  clip-path: none;
  box-shadow:
    inset 3px 3px 0 #16131d,
    inset -3px -3px 0 #4d4346;
  color: #f9e4c1;
`

export const retroButton = css`
  --px-top: #ffcb7a;
  --px-face: #e76735;
  --px-side: #a52c29;
  --px-base: #681b28;
  --px-ink: #34151a;
  --px-hover: #f7813f;

  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  border: 3px solid #31101b;
  border-radius: 0;
  clip-path: none;
  transform: none;
  background: var(--px-face);
  color: var(--px-ink);
  box-shadow:
    inset 0 3px 0 var(--px-top),
    inset 0 -4px 0 var(--px-side),
    inset 3px 0 0 rgba(255, 218, 132, .45),
    inset -3px 0 0 rgba(85, 20, 30, .4),
    0 4px 0 var(--px-base),
    0 7px 0 #130b11;
  text-shadow: 1px 1px 0 rgba(255, 218, 147, .25);
  font-family: ${pixelFont};
  font-weight: 400;
  line-height: 1.65;
  cursor: pointer;
  touch-action: manipulation;
  transition: background-color 100ms steps(2, end), filter 100ms steps(2, end);

  &::before {
    content: '';
    position: absolute;
    top: 3px;
    left: 8px;
    right: 8px;
    height: 2px;
    background: rgba(255, 235, 153, .45);
    pointer-events: none;
  }

  &&:hover:not(:disabled) {
    background: var(--px-hover);
    color: var(--px-ink);
    filter: brightness(1.06);
  }

  &&:active:not(:disabled) {
    transform: translateY(3px);
    box-shadow:
      inset 0 3px 0 var(--px-top),
      inset 0 -2px 0 var(--px-side),
      0 1px 0 var(--px-base),
      0 3px 0 #130b11;
  }

  &&:disabled,
  &&:disabled:hover {
    --px-top: #92908b;
    --px-side: #4c454c;
    --px-base: #302932;
    background: #6b6262;
    color: #d1c5b8;
    filter: saturate(.3);
    box-shadow:
      inset 0 3px 0 #89837f,
      inset 0 -4px 0 #51484b,
      0 3px 0 #342c32;
    text-shadow: none;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 3px dashed #ffe9a0;
    outline-offset: 5px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`
