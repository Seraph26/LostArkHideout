# Optimizer v15 restore point

The verified pre-v16 optimizer state is preserved in Git history at commit:

`bc2d30a71f00b004dea8f1e21ebcbf91f6725397`

That commit contains the optimizer state immediately before the practical party-value calculation experiment.

To restore that exact state, revert or check out the optimizer/index files from that commit. This manifest intentionally points to the immutable Git commit rather than duplicating a large JavaScript file.