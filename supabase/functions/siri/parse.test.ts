import { describe, expect, it } from 'vitest'
import { parseCommand, PRIORITY_BUMP } from './parse'

describe('parseCommand — add', () => {
  it('parses a bare add', () => {
    expect(parseCommand('add buy milk')).toEqual({ action: 'add', text: 'buy milk' })
  })
  it('strips a leading app name and courtesy words', () => {
    expect(parseCommand('SKUNKWORKS add buy milk')).toEqual({ action: 'add', text: 'buy milk' })
    expect(parseCommand('hey add water the plants')).toEqual({ action: 'add', text: 'water the plants' })
  })
  it('strips a trailing "in skunkworks" and punctuation', () => {
    expect(parseCommand('add call the dentist in skunkworks.')).toEqual({
      action: 'add',
      text: 'call the dentist',
    })
  })
  it('accepts add synonyms', () => {
    expect(parseCommand('new task water plants')).toEqual({ action: 'add', text: 'water plants' })
    expect(parseCommand('remind me to call mom')).toEqual({ action: 'add', text: 'call mom' })
    expect(parseCommand('add a task file taxes')).toEqual({ action: 'add', text: 'file taxes' })
  })
  it('keeps "for" inside an add (only reward-add treats it as a cost)', () => {
    expect(parseCommand('add buy a gift for the party')).toEqual({
      action: 'add',
      text: 'buy a gift for the party',
    })
  })
})

describe('parseCommand — task edits', () => {
  it('completes', () => {
    expect(parseCommand('complete buy milk')).toEqual({ action: 'complete', text: 'buy milk' })
    expect(parseCommand('done buy milk')).toEqual({ action: 'complete', text: 'buy milk' })
    expect(parseCommand('finished the report')).toEqual({ action: 'complete', text: 'the report' })
    expect(parseCommand('mark as done buy milk')).toEqual({ action: 'complete', text: 'buy milk' })
  })
  it('defers', () => {
    expect(parseCommand('snooze buy milk')).toEqual({ action: 'defer', text: 'buy milk' })
    expect(parseCommand('postpone taxes')).toEqual({ action: 'defer', text: 'taxes' })
  })
  it('deletes', () => {
    expect(parseCommand('delete buy milk')).toEqual({ action: 'delete', text: 'buy milk' })
    expect(parseCommand('remove the old thing')).toEqual({ action: 'delete', text: 'the old thing' })
  })
  it('prioritises importance and urgency', () => {
    expect(parseCommand('important taxes')).toEqual({
      action: 'prioritize',
      text: 'taxes',
      importance: PRIORITY_BUMP,
    })
    expect(parseCommand('flag the report')).toEqual({
      action: 'prioritize',
      text: 'the report',
      importance: PRIORITY_BUMP,
    })
    expect(parseCommand('urgent call the bank')).toEqual({
      action: 'prioritize',
      text: 'call the bank',
      urgency: PRIORITY_BUMP,
    })
  })
  it('attaches a note with a separator', () => {
    expect(parseCommand('note on buy milk: get the good stuff')).toEqual({
      action: 'note',
      text: 'buy milk',
      note: 'get the good stuff',
    })
    expect(parseCommand('note buy milk saying get whole milk')).toEqual({
      action: 'note',
      text: 'buy milk',
      note: 'get whole milk',
    })
  })
  it('returns null for a note without a clear split (AI/help handles it)', () => {
    expect(parseCommand('note buy milk get whole milk')).toBeNull()
  })
})

describe('parseCommand — rewards', () => {
  it('adds a reward with a cost', () => {
    expect(parseCommand('add reward massage for 200')).toEqual({
      action: 'add_reward',
      name: 'massage',
      cost: 200,
    })
    expect(parseCommand('new reward long bath 150 coins')).toEqual({
      action: 'add_reward',
      name: 'long bath',
      cost: 150,
    })
  })
  it('returns null for a reward without a cost', () => {
    expect(parseCommand('add reward massage')).toBeNull()
  })
  it('re-costs a reward', () => {
    expect(parseCommand('set massage to 300')).toEqual({
      action: 'set_reward_cost',
      name: 'massage',
      cost: 300,
    })
  })
  it('redeems', () => {
    expect(parseCommand('redeem massage')).toEqual({ action: 'redeem', name: 'massage' })
    expect(parseCommand('claim my long bath')).toEqual({ action: 'redeem', name: 'my long bath' })
  })
})

describe('parseCommand — reads', () => {
  it('parses status', () => {
    expect(parseCommand('status')).toEqual({ action: 'status' })
    expect(parseCommand('how am i doing')).toEqual({ action: 'status' })
  })
  it('parses next', () => {
    expect(parseCommand('next')).toEqual({ action: 'next' })
    expect(parseCommand("what's next")).toEqual({ action: 'next' })
    expect(parseCommand('what should i do')).toEqual({ action: 'next' })
  })
})

describe('parseCommand — misc', () => {
  it('returns null for empty or unparseable input', () => {
    expect(parseCommand('')).toBeNull()
    expect(parseCommand('   ')).toBeNull()
    expect(parseCommand('flarble wibbit')).toBeNull()
  })
  it('does not treat words that merely start with a verb as that verb', () => {
    expect(parseCommand('address the leak')).toBeNull() // not "add ..."
  })
})
