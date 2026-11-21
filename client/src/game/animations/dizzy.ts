// Animação de tontura em pixel art para o debuff do Chute.
// Desenhada sobre o personagem, sem modificar sua spritesheet.
// A posição e o ciclo vêm do tempo: animação consistente entre FPS diferentes.
export function drawKickDizziness(
  context:CanvasRenderingContext2D,
  x:number,
  y:number,
  elapsedMs:number
): void {
  const rotation = (Math.max(0, elapsedMs) / 700) * Math.PI * 2
  const colors = ['#ffe36b', '#fff5ba', '#ffbd53']

  context.save()
  for (let i = 0; i < 3; i++) {
    const angle = rotation + (i * Math.PI * 2) / 3
    const cx = Math.round(x + 8 + Math.cos(angle) * 9)
    const cy = Math.round(y + 3 + Math.sin(angle) * 4)

    // Cruz de 7×7 com pixels inteiros: estrela retrô girando na cabeça.
    context.fillStyle = '#614025'
    context.fillRect(cx - 1, cy - 3, 3, 7)
    context.fillRect(cx - 3, cy - 1, 7, 3)
    context.fillStyle = colors[i]
    context.fillRect(cx, cy - 3, 1, 7)
    context.fillRect(cx - 3, cy, 7, 1)
    context.fillStyle = '#fffdf2'
    context.fillRect(cx, cy, 1, 1)
  }
  context.restore()
}
