import styled, { keyframes } from 'styled-components'
import { pixelFont, retroInset, retroPanel } from '~/site/theme/retro'

const enter = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`
const countdown = keyframes`
  from { width: 100%; }
  to { width: 0%; }
`
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: 18px;
  overflow-y: auto;
  background: rgba(12, 10, 20, .94);
  color: #ffedcb;
`

export const Glow = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    repeating-linear-gradient(0deg, rgba(243, 129, 64, .025) 0 3px, transparent 3px 14px),
    repeating-linear-gradient(90deg, rgba(255, 215, 135, .016) 0 3px, transparent 3px 14px);
`

export const Card = styled.section`
  ${retroPanel}
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: min(100%, 480px);
  padding: clamp(18px, 5vw, 34px);
  text-align: center;
  border: 4px solid #b75431;
  outline: 4px solid #1a1019;
  box-shadow:
    inset 0 0 0 4px #653c35,
    inset 0 6px 0 #9b5138,
    0 7px 0 #3c1621,
    0 12px 0 #0d0a11;
  animation: ${enter} .3s steps(5, end) both;

  &::before, &::after {
    content: '';
    position: absolute;
    width: 11px;
    height: 11px;
    background: #ffb26f;
    box-shadow: inset -3px -3px 0 #ba572f;
  }
  &::before { top: 8px; left: 8px; }
  &::after { bottom: 8px; right: 8px; }

  .champion {
    margin: 9px 0 21px;
    color: #ffc683;
    font-family: ${pixelFont};
    font-size: 9px;
    line-height: 1.8;
    letter-spacing: .4px;
  }

  .result-symbol {
    margin: 27px auto 21px;
    color: #ffbd75;
    font-size: 62px;
    line-height: 1.4;
  }

  @media (max-height: 580px) {
    padding: 13px 22px;
    .result-symbol { margin: 11px auto; }
  }

  @media (prefers-reduced-motion: reduce) { animation: none; }
`

export const Eyebrow = styled.p`
  margin: 0 0 16px;
  color: #dfad83;
  font-family: ${pixelFont};
  font-size: 8px;
  line-height: 1.7;
`

export const Title = styled.h2`
  margin: 0;
  color: #ffb66e;
  font-family: ${pixelFont};
  font-size: clamp(18px, 5vw, 35px);
  line-height: 1.5;
  overflow-wrap: anywhere;
  text-shadow: 4px 4px 0 #6c2a27;
`

export const Subtitle = styled.p`
  margin: 11px 0 18px;
  color: #fae9d1;
  font-family: ${pixelFont};
  font-size: 8px;
  line-height: 1.9;
`

export const Portrait = styled.div`
  ${retroInset}
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 138px;
  height: 170px;
  margin: 17px auto 13px;
  background: #312936;
  border: 3px solid #120e19;
  box-shadow: inset 0 0 0 4px #86563e, 4px 4px 0 #0d0b13;

  .pixel-crown {
    position: absolute;
    top: -26px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    filter: drop-shadow(3px 3px 0 #25111b);
  }

  .plate {
    position: absolute;
    bottom: 12px;
    width: 84px;
    height: 6px;
    background: #e4a859;
    box-shadow: 0 4px 0 #70342b;
  }

  @media (max-height: 580px) {
    width: 103px;
    height: 128px;
    margin: 9px auto;
  }
`

export const PortraitCanvas = styled.canvas`
  display: block;
  width: 85px;
  height: 135px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  animation: ${float} 2s steps(4, end) infinite;

  @media (max-height: 580px) {
    width: 68px;
    height: 108px;
  }

  @media (prefers-reduced-motion: reduce) { animation: none; }
`

export const WinnerName = styled.p`
  margin: 8px 0 0;
  overflow-wrap: anywhere;
  color: #fff0cc;
  font-family: ${pixelFont};
  font-size: clamp(12px, 3vw, 18px);
  line-height: 1.8;
  text-shadow: 3px 3px 0 #582a26;
`

export const Footer = styled.p`
  margin: 19px 0 11px;
  color: #d7c2af;
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 12px;
  line-height: 1.5;
`

export const Progress = styled.div`
  width: 100%;
  height: 10px;
  overflow: hidden;
  background: #29202b;
  border: 2px solid #160f17;
  box-shadow: inset 0 0 0 1px #7d493c;
`

export const ProgressFill = styled.div`
  height: 100%;
  background: #f0954b;
  box-shadow: inset 0 -2px 0 #aa4c2f;
  animation: ${countdown} 5s steps(40, end) forwards;
`
