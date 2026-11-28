import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LAB_INTRO_FIRST_DURATION_MS,
  LAB_INTRO_REPEAT_DURATION_MS,
  LAB_INTRO_STORAGE_KEY,
  labIntroDuration,
  labIntroModeForStage,
  mayAnnounceRoundReady
} from '../../shared/labIntro'

test('só o Laboratório mostra a introdução, independentemente da visita', () => {
  assert.equal(labIntroModeForStage(0, false), null)
  assert.equal(labIntroModeForStage(2, true), null)
  assert.equal(labIntroModeForStage(1, false), 'full')
  assert.equal(labIntroModeForStage(1, true), 'compact')
})

test('primeira visita exibe tutorial completo; próximas mostram lembrete', () => {
  assert.equal(labIntroDuration('full'), LAB_INTRO_FIRST_DURATION_MS)
  assert.equal(labIntroDuration('compact'), LAB_INTRO_REPEAT_DURATION_MS)
  assert.ok(LAB_INTRO_FIRST_DURATION_MS > LAB_INTRO_REPEAT_DURATION_MS)
  assert.ok(LAB_INTRO_FIRST_DURATION_MS >= 5000)
  assert.ok(LAB_INTRO_STORAGE_KEY.includes('lab-intro'))
})

test('ready depende de recursos e briefing concluídos, sem duplicações', () => {
  assert.equal(mayAnnounceRoundReady(false, false, false), false)
  assert.equal(mayAnnounceRoundReady(true, false, false), false)
  assert.equal(mayAnnounceRoundReady(false, true, false), false)
  assert.equal(mayAnnounceRoundReady(true, true, false), true)
  assert.equal(mayAnnounceRoundReady(true, true, true), false)
})

test('cada arena não altera seu stage nem a regra de mutações', () => {
  for (let stage = 0; stage <= 2; stage++) {
    const before = stage
    labIntroModeForStage(stage, false)
    assert.equal(stage, before)
  }
})
