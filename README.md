# Setup Nix Cache

Sets up the nunu nix cache. Supports automatic uploading with signing of all built outputs.

Usage:

```yaml
- name: Set up nix cache
  uses: nunu-ai/nunu-actions@setup-nix-cache
  with:
    substituters: ${{ vars.NIX_SUBSTITUTERS }}
    trusted_public_keys: ${{ vars.NIX_TRUSTED_PUBLIC_KEYS }}
    secret_keys: ${{ secrets.NIX_SIGNING_KEY }}
    aws_access_key_id: ${{ secrets.NIX_AWS_ACCESS_KEY_ID }}
    aws_secret_access_key: ${{ secrets.NIX_AWS_SECRET_ACCESS_KEY }}
```
