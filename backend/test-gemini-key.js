#!/usr/bin/env node
/**
 * Quick script to test Gemini API key and see the raw error.
 * Run: node test-gemini-key.js
 */
import 'dotenv/config';

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('No GEMINI_API_KEY in .env');
  process.exit(1);
}

console.log('Testing Gemini API key...');
console.log('Key preview:', key.slice(0, 10) + '...' + key.slice(-4));

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
const body = {
  contents: [{ parts: [{ text: 'Say "OK" in one word.' }] }],
};

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const json = await res.json();
console.log('\n--- Raw API response ---');
console.log(JSON.stringify(json, null, 2));
console.log('\n--- Status:', res.status, res.statusText);
console.log('--- Error message:', json.error?.message ?? '(none)');

if (res.ok) {
  console.log('\n✓ API key works!');
} else {
  console.log('\n✗ API returned an error. Check the message above.');
}
