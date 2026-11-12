import styled, { keyframes } from 'styled-components'

const enter = keyframes`
  from { opacity: 0; transform: translateY(20px) scale(.94); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`
const countdown = keyframes`
  from { width: 100%; }
  to { width: 0%; }
`
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
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
  color: #f8f5ed;
  background: rgba(5, 9, 22, .91);
  backdrop-filter: blur(5px);
  font-family: 'Courier New', Courier, monospace;
`

export const Glow = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 29%, rgba(251, 198, 84, .18), transparent 40%),
    repeating-linear-gradient(0deg, transparent 0 31px, rgba(255, 255, 255, .018) 32px);
`

export const Card = styled.section`
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: min(100%, 460px);
  padding: clamp(18px, 5vw, 34px);
  text-align: center;
  background: linear-gradient(156deg, #1a283b 0%, #121827 64%, #1d1834 100%);
  border: 4px solid #ddad55;
  outline: 4px solid rgba(14, 19, 29, .92);
  box-shadow: 8px 8px 0 #060810, inset 0 0 0 2px #4c3b33;
  animation: ${enter} .35s ease-out both;

  &::before, &::after {
    content: '';
    position: absolute;
    width: 10px;
    height: 10px;
    background: #ffe19a;
  }
  &::before { top: 9px; left: 9px; }
  &::after { bottom: 9px; right: 9px; }

  .champion {
    margin: 5px 0 22px;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 3px;
    color: #d7ac61;
  }

  .result-symbol {
    margin: 29px auto 23px;
    font-size: 70px;
    color: #e9be6d;
  }

  @media (max-height: 580px) {
    padding: 15px 24px;
    .result-symbol { margin: 12px auto; }
  }
`

export const Eyebrow = styled.p`
  margin: 0 0 15px;
  color: #9cb0cf;
  font-size: 10px;
  font-weight: bold;
  letter-spacing: 2px;
`

export const Title = styled.h2`
  margin: 0;
  color: #ffd781;
  font-size: clamp(32px, 8vw, 55px);
  letter-spacing: 3px;
  line-height: 1.08;
  text-shadow: 4px 4px 0 #614125, 0 0 20px rgba(255, 201, 95, .17);
`

export const Subtitle = styled.p`
  margin: 11px 0 18px;
  color: #e1e8f1;
  font-size: 11px;
  line-height: 1.6;
  letter-spacing: 1.1px;
`

export const Portrait = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 14px auto;
  width: 138px;
  height: 170px;
  background: radial-gradient(ellipse at center, #40405e, #24213b 70%);
  border: 2px solid #7c7196;
  box-shadow: inset 0 0 0 4px #222036;

  .crown {
    position: absolute;
    z-index: 2;
    top: -26px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 29px;
    filter: drop-shadow(2px 3px 0 #171322);
  }

  .plate {
    position: absolute;
    bottom: 12px;
    width: 84px;
    height: 6px;
    background: #e7b75a;
    box-shadow: 0 4px 0 #694b30;
  }

  @media (max-height: 580px) {
    width: 103px;
    height: 128px;
    margin: 7px auto;
  }
`

export const PortraitCanvas = styled.canvas`
  display: block;
  width: 85px;
  height: 135px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  animation: ${float} 2s ease-in-out infinite;
  @media (max-height: 580px) {
    width: 68px;
    height: 108px;
  }
`

export const WinnerName = styled.p`
  margin: 6px 0 0;
  overflow-wrap: anywhere;
  color: #fff5d8;
  font-size: clamp(18px, 5vw, 28px);
  font-weight: 900;
  text-shadow: 2px 3px 0 #11111f;
`

export const Footer = styled.p`
  margin: 22px 0 10px;
  color: #b3c1d4;
  font-size: 11px;
`

export const Progress = styled.div`
  width: 100%;
  height: 7px;
  overflow: hidden;
  background: #344257;
  box-shadow: inset 0 0 0 1px #172135;
`

export const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #d78d3c, #fff0ab);
  animation: ${countdown} 5s linear forwards;
`
