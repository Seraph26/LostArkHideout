# Candidate roster performance diagnosis

The initial candidate-roster implementation caused a Firefox page-slowing warning because it installed a broad MutationObserver and called `patchMain()` on every roster mutation. This is being corrected by scoping the observer to the roster element when available and using a re-entry guard so DOM patching cannot recursively trigger itself.

No optimizer, hover, arrow, or formatting logic is involved in this fix.