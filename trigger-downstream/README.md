# Trigger downstream

This action is used to trigger a pipeline in another repository.

Usage:

```yaml
- name: Trigger version bump
  uses: nunu-ai/nunu-actions/trigger-downstream
  with:
    token: "${{ secrets.PAT }}"
    repo: "nunu-ai/example"
    event_type: "bump"
    payload: '{"package": "example_package"}'
```
