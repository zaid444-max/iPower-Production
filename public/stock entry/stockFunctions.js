export function focusNextInput(input, inputType) {
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const nextInp = e.target.closest('.container-div').nextElementSibling?.querySelector(`.${inputType}-inp`);
      nextInp?.focus();
      nextInp?.select();
    }
  })
}