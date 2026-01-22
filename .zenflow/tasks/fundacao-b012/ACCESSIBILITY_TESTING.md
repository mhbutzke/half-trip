# Half Trip - Accessibility Testing Guide

## Overview

This document provides comprehensive testing procedures to ensure Half Trip meets WCAG 2.1 Level AA accessibility standards.

---

## Quick Reference

### Testing Checklist

- [ ] Keyboard Navigation (20 min)
- [ ] Screen Reader Testing (30 min)
- [ ] Color Contrast (10 min)
- [ ] Zoom & Text Scaling (10 min)
- [ ] Focus Indicators (10 min)
- [ ] Form Validation (15 min)
- [ ] ARIA Attributes (15 min)
- [ ] Touch Targets (Mobile) (10 min)
- [ ] Automated Testing (10 min)

**Total Time**: ~2 hours for comprehensive testing

---

## 1. Keyboard Navigation Testing

### Goal

Ensure all functionality is accessible without a mouse.

### Test Procedure

#### Skip Navigation

1. **Load any authenticated page**
2. **Press Tab key once**
3. **Expected**: "Pular para o conteúdo principal" link appears
4. **Press Enter**
5. **Expected**: Focus moves to main content area
6. **Status**: ✅ Implemented

#### Global Navigation

1. **Tab through header**
2. **Expected order**:
   - Skip link (appears on focus)
   - Logo link
   - Navigation links (Viagens, Configurações)
   - Sync status button
   - Notifications button
   - Theme toggle button
   - User menu button
3. **Press Enter** on each
4. **Expected**: Navigates correctly or opens menu

#### Trips List

1. **Navigate to /trips**
2. **Tab through page**
3. **Expected**: Can focus on:
   - "Nova viagem" button
   - Each trip card (entire card is clickable)
   - Action menu button for each trip (appears on focus)
4. **Press Enter on trip card**
5. **Expected**: Navigates to trip detail

#### Trip Detail Pages

1. **Test itinerary page** (/trip/[id]/itinerary)
   - Tab to "Adicionar atividade" button
   - Tab to each activity card
   - Tab to action menu (appears on focus)
   - Tab to "Ver detalhes" button
   - Test expand/collapse with Enter/Space

2. **Test expenses page** (/trip/[id]/expenses)
   - Tab to filter controls
   - Tab to "Nova despesa" button
   - Tab to each expense card
   - Tab to action menus

3. **Test balance page** (/trip/[id]/balance)
   - Tab through participant cards
   - Tab to "Marcar pago" buttons

#### Dialogs and Modals

1. **Open any dialog** (e.g., Create Trip)
2. **Expected**:
   - Focus moves into dialog
   - Tab cycles within dialog only (focus trap)
   - Can reach all form fields
   - Can reach action buttons
3. **Press Escape**
4. **Expected**:
   - Dialog closes
   - Focus returns to trigger button

#### Dropdown Menus

1. **Open user menu** (Tab to avatar, press Enter)
2. **Expected**:
   - Menu opens
   - First item focused
   - Arrow keys navigate menu items
   - Enter selects item
   - Escape closes menu

### Pass Criteria

- [ ] All interactive elements reachable via keyboard
- [ ] Tab order is logical
- [ ] Skip link works
- [ ] Focus trapped in dialogs
- [ ] Menus navigable with arrows
- [ ] Escape closes overlays
- [ ] No keyboard traps

---

## 2. Screen Reader Testing

### Recommended Tools

- **macOS**: VoiceOver (Cmd + F5)
- **Windows**: NVDA (free) or JAWS (paid)
- **iOS**: VoiceOver (Settings → Accessibility)
- **Android**: TalkBack (Settings → Accessibility)

### Test Procedure

#### Page Structure

1. **Navigate to any page with screen reader on**
2. **Use heading navigation** (VoiceOver: VO + Cmd + H)
3. **Expected**:
   - Proper heading hierarchy (h1 → h2 → h3)
   - Headings describe sections accurately
4. **Use landmarks navigation** (VoiceOver: VO + U → Landmarks)
5. **Expected landmarks**:
   - Banner (header)
   - Navigation
   - Main
   - Complementary (if sidebar present)

#### Links and Buttons

1. **Navigate by links** (VoiceOver: VO + Cmd + L)
2. **Expected**:
   - Links announce destination clearly
   - External links announce "abre em nova aba"
3. **Navigate by buttons** (VoiceOver: VO + Cmd + B)
4. **Expected**:
   - Buttons announce action clearly
   - Icon-only buttons have proper labels
   - State changes announced (expanded/collapsed)

#### Forms

1. **Open "Nova viagem" dialog**
2. **Navigate through form fields**
3. **Expected**:
   - Each field has proper label
   - Required fields announced
   - Field type announced (text, date, select)
   - Helper text read
4. **Submit with errors**
5. **Expected**:
   - Error announced
   - Field marked as invalid
   - Error message associated with field

#### Dynamic Content

1. **Add an expense while screen reader is on**
2. **Expected**:
   - Toast notification announced
   - New item appears in list and is accessible
3. **Trigger sync**
4. **Expected**:
   - Sync status change announced
   - "Sincronizando..." → "Sincronizado" transitions announced

#### Data Tables (if applicable)

1. **Navigate balance summary**
2. **Expected**:
   - Table structure announced
   - Headers associated with cells
   - Row/column position announced

### Pass Criteria

- [ ] All content readable by screen reader
- [ ] No redundant icon announcements
- [ ] Proper labels on all controls
- [ ] Form errors announced and associated
- [ ] Dynamic updates announced via live regions
- [ ] No missing alt text
- [ ] Logical reading order

---

## 3. Color Contrast Testing

### Tools

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools → Lighthouse
- Browser extensions: WAVE, axe DevTools

### Colors to Test

#### Light Mode

```
Background: oklch(0.995 0 0) - Almost white
Foreground: oklch(0.141 0.005 285.823) - Very dark gray
Muted foreground: oklch(0.45 0.01 285) - Medium gray ✅ Fixed
Primary: oklch(0.55 0.15 195) - Teal
```

#### Key Combinations

1. **Foreground on background**
   - `oklch(0.141 0.005 285.823)` on `oklch(0.995 0 0)`
   - **Requirement**: 4.5:1 for normal text, 3:1 for large text
   - **Expected**: ✅ Passes (high contrast)

2. **Muted text on background**
   - `oklch(0.45 0.01 285)` on `oklch(0.995 0 0)`
   - **Requirement**: 4.5:1
   - **Expected**: ✅ Passes (after fix)

3. **Primary button**
   - White text on teal background
   - **Expected**: ✅ Passes

4. **Link text**
   - Primary color text on background
   - **Requirement**: 4.5:1
   - **Expected**: ✅ Passes

5. **Badge outline variant**
   - Border must have 3:1 contrast
   - **Check in both light and dark mode**

### Dark Mode

Repeat all tests with dark theme enabled.

### Pass Criteria

- [ ] All text has minimum 4.5:1 contrast
- [ ] Large text (18pt+) has minimum 3:1
- [ ] UI components have 3:1 contrast
- [ ] Focus indicators have 3:1 contrast
- [ ] No reliance on color alone to convey information

---

## 4. Zoom and Text Scaling

### Test Procedure

#### Browser Zoom (200%)

1. **Press Cmd/Ctrl + to zoom to 200%**
2. **Navigate through all pages**
3. **Expected**:
   - No horizontal scrolling
   - No content cut off
   - All functionality still works
   - Touch targets still at least 44px

#### Text Spacing

Test with this CSS bookmarklet:

```javascript
javascript: (function () {
  var d = document.body.style;
  d.lineHeight = '1.5';
  d.letterSpacing = '0.12em';
  d.wordSpacing = '0.16em';
})();
```

**Expected**:

- Text remains readable
- No overlapping content
- Buttons don't break

#### Mobile Text Sizing

1. **Test on mobile device**
2. **Go to device settings**
3. **Increase text size to maximum**
4. **Open app**
5. **Expected**:
   - Text scales appropriately
   - Layout doesn't break
   - Touch targets remain usable

### Pass Criteria

- [ ] Works at 200% zoom without horizontal scroll
- [ ] Text spacing adjustment doesn't break layout
- [ ] Content remains readable with increased text size
- [ ] All functionality accessible at high zoom levels

---

## 5. Focus Indicators

### Test Procedure

#### Visibility

1. **Navigate with keyboard on light theme**
2. **Check each interactive element**
3. **Expected**:
   - Visible focus ring around focused element
   - Ring color: teal (matching primary)
   - Ring thickness: 3px
   - Ring offset: 2px (space between element and ring)

4. **Switch to dark theme**
5. **Repeat test**
6. **Expected**:
   - Focus still clearly visible
   - Sufficient contrast with dark background

#### Custom Focus States

Test these specific components:

- Skip navigation link (appears on focus)
- Hidden action menu buttons (become visible on focus)
- Card components
- Form inputs
- Buttons
- Links
- Dropdowns

### Pass Criteria

- [ ] All focusable elements have visible indicator
- [ ] Focus indicator has 3:1 contrast with background
- [ ] Focus indicator not obscured by other content
- [ ] Custom focus states work correctly

---

## 6. Form Validation

### Test Procedure

#### Visual Validation

1. **Open "Create Trip" form**
2. **Submit empty form**
3. **Expected**:
   - Red border on invalid fields
   - Error icon displayed
   - Error message below field
4. **Type valid input**
5. **Expected**:
   - Error cleared immediately
   - Border returns to normal

#### Screen Reader Validation

1. **Open form with screen reader**
2. **Submit with errors**
3. **Expected**:
   - Error announced
   - Field announced as "invalid"
   - `aria-invalid="true"` on field
   - `aria-describedby` links to error message
4. **Navigate to invalid field**
5. **Expected**:
   - Error message read after field label

#### Error Prevention

1. **Test date pickers**
2. **Expected**:
   - End date can't be before start date
   - Clear validation message if attempted

3. **Test expense split**
4. **Expected**:
   - Split amounts must equal total
   - Clear error if they don't

### Pass Criteria

- [ ] Errors clearly indicated visually
- [ ] Errors announced to screen readers
- [ ] Error messages are descriptive
- [ ] Fields properly associated with errors
- [ ] Validation doesn't rely on color alone
- [ ] Success states also indicated

---

## 7. ARIA Attributes Audit

### Automated Check

Use browser extension or command:

```bash
# Install axe-core CLI
npm install -g @axe-core/cli

# Run audit
axe https://your-app-url.com
```

### Manual Check

#### Labels

- [ ] All form inputs have labels
- [ ] Icon-only buttons have `aria-label`
- [ ] Links describe destination
- [ ] Images have appropriate alt text

#### Roles

- [ ] Semantic HTML used (prefer `<button>` over `<div role="button">`)
- [ ] Custom widgets have proper roles
- [ ] Landmarks identified (banner, main, navigation)

#### States

- [ ] Expanded/collapsed indicated (`aria-expanded`)
- [ ] Selected items indicated (`aria-selected` or `aria-current`)
- [ ] Disabled state communicated
- [ ] Loading states announced

#### Live Regions

- [ ] Dynamic content updates use `aria-live`
- [ ] Toasts/notifications announced
- [ ] Sync status changes announced
- [ ] Balance calculations announced (polite)

#### Relationships

- [ ] Labeled-by relationships correct
- [ ] Described-by relationships correct
- [ ] Controls relationships correct
- [ ] Owns relationships correct (for composite widgets)

### Pass Criteria

- [ ] No missing labels
- [ ] ARIA used correctly (not overused)
- [ ] Dynamic content accessible
- [ ] Relationships properly defined

---

## 8. Touch Targets (Mobile)

### Test on Physical Device

**Recommended devices**: iPhone SE (small screen), iPad, Android phone

### Minimum Size

All interactive elements must be at least **44x44 pixels**.

### Test Procedure

#### Header

- [ ] Logo link
- [ ] Navigation links
- [ ] Theme toggle
- [ ] User menu button

#### Mobile Navigation

- [ ] Bottom nav icons
- [ ] Each nav item (min 44px)

#### Cards

- [ ] Entire card clickable
- [ ] Action menu button (revealed on tap)

#### Forms

- [ ] Input fields (height: 44px) ✅
- [ ] Buttons (height: 44px) ✅
- [ ] Dropdowns
- [ ] Date pickers

#### Spacing

- [ ] Adequate space between touch targets
- [ ] Accidental taps unlikely

### Pass Criteria

- [ ] All targets minimum 44x44 pixels
- [ ] Adequate spacing between targets
- [ ] No accidental taps in testing
- [ ] Touch feedback clear (visual response)

---

## 9. Automated Testing

### Lighthouse Audit

1. **Open Chrome DevTools**
2. **Go to Lighthouse tab**
3. **Select "Accessibility" category**
4. **Run audit**
5. **Target score**: 90+

**Common issues to check**:

- Missing alt text
- Low contrast
- Missing labels
- Missing landmarks
- Improper heading order

### axe DevTools

1. **Install browser extension**
   - [Chrome](https://chrome.google.com/webstore/detail/axe-devtools/lhdoppojpmngadmnindnejefpokejbdd)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/)

2. **Open DevTools → axe tab**
3. **Click "Scan All of My Page"**
4. **Review issues**:
   - Critical (must fix)
   - Serious (should fix)
   - Moderate (nice to fix)
   - Minor (optional)

### WAVE Extension

1. **Install [WAVE](https://wave.webaim.org/extension/)**
2. **Click WAVE icon**
3. **Review**:
   - Errors (red)
   - Alerts (yellow)
   - Features (green)
   - Structural elements (blue)

### Pa11y CLI (Optional)

```bash
# Install
npm install -g pa11y

# Run test
pa11y https://your-app-url.com

# Generate report
pa11y https://your-app-url.com --reporter json > report.json
```

### Pass Criteria

- [ ] Lighthouse accessibility score ≥ 90
- [ ] axe DevTools: 0 critical issues
- [ ] WAVE: 0 errors
- [ ] All serious issues addressed

---

## 10. Specific Features Testing

### Drag and Drop (Activity Reordering)

#### Mouse

- [ ] Can drag activities
- [ ] Visual feedback during drag
- [ ] Drop zones clearly indicated

#### Keyboard

1. **Tab to activity card**
2. **Press Space to grab**
3. **Use arrow keys to move**
4. **Press Space to drop**
5. **Expected**:
   - Announces "grabbed"
   - Announces position while moving
   - Announces "dropped" with new position

#### Screen Reader

- [ ] Instructions announced
- [ ] Current position announced
- [ ] New position announced after drop

### File Upload (Attachments, Receipts)

#### Visual

- [ ] Clear drop zone
- [ ] File requirements stated
- [ ] Progress indicated

#### Keyboard

- [ ] Can activate file picker with Enter/Space
- [ ] Can navigate file preview
- [ ] Can delete uploaded files

#### Screen Reader

- [ ] Upload button properly labeled
- [ ] File name announced after upload
- [ ] File size announced
- [ ] Delete button labeled with file name

### Notifications

- [ ] Toast announces content
- [ ] Notification panel accessible
- [ ] Unread count announced
- [ ] Mark as read works with keyboard

---

## Testing Schedule

### Pre-Release Testing

Run full test suite before each major release.

### Continuous Testing

- **Weekly**: Quick keyboard nav check
- **Sprint**: Run automated tools
- **Release**: Full manual test

### Regression Testing

Re-test after:

- UI component changes
- Form modifications
- New interactive features
- Theme/color updates

---

## Reporting Issues

### Issue Template

```markdown
## Accessibility Issue

**Page/Component**: [e.g., Trip detail page / Activity card]

**WCAG Criterion**: [e.g., 2.1.1 Keyboard / 1.4.3 Contrast]

**Severity**: Critical | High | Medium | Low

**Description**:
[Clear description of the issue]

**Steps to Reproduce**:

1. Navigate to [page]
2. [Action]
3. [Observe issue]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Assistive Technology**:

- Screen reader: [VoiceOver / NVDA / JAWS]
- Browser: [Chrome / Safari / Firefox]
- OS: [macOS / Windows / iOS / Android]

**Screenshots/Video**:
[If applicable]

**Suggested Fix**:
[Optional: proposed solution]
```

---

## Resources

### Guidelines

- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Tools

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Extension](https://wave.webaim.org/extension/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Screen Readers

- [VoiceOver Guide (macOS)](https://support.apple.com/guide/voiceover/welcome/mac)
- [NVDA Guide (Windows)](https://www.nvaccess.org/get-help/nvda-basics/)
- [JAWS Keystrokes](https://www.freedomscientific.com/training/jaws/hotkeys/)

### Learning

- [Web Accessibility by Google (Free Course)](https://www.udacity.com/course/web-accessibility--ud891)
- [A11ycasts YouTube Playlist](https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9LVWWVqvHlYJyqw7g)

---

## Conclusion

Half Trip's accessibility implementation is comprehensive. By following this testing guide regularly, we ensure the app remains accessible to all users, including those using assistive technologies.

**Target**: WCAG 2.1 Level AA Compliance
**Current Status**: On track after implementing fixes from accessibility audit

**Next Steps**:

1. Complete manual screen reader testing
2. Run automated tools on all major pages
3. Test on real mobile devices
4. Document any remaining issues
5. Plan fixes for upcoming sprint
