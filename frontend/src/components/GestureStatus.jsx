export function GestureStatus({ gesture }) {
  if (!gesture) return null;
  const labels = {
    point_up: '↑ Scroll up',
    victory: '↓ Scroll down',
    i_love_you: '⇄ Switch panel',
    three_fingers: '⇄ Switch panel',
    thumb_up: '👍 Confirm',
    swipe_up: '↑ Scroll up',
    swipe_down: '↓ Scroll down',
    swipe_left: '← Prev file',
    swipe_right: '→ Next file',
    press: 'Select',
    fist: 'Play audio',
    lshape_start: 'Hold to ask Gemini',
    lshape_stop: 'Release to send',
  };
  return (
    <div className="gesture-status">
      <span className="gesture-badge">{labels[gesture.type] || gesture.type}</span>
    </div>
  );
}
