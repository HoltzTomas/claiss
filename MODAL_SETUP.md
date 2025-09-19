# Modal Manim Compilation Setup

This document explains how to set up and deploy the Modal-based Manim compilation system for production use.

## Overview

The Modal integration allows Claiss to compile Manim animations in serverless containers, solving the production deployment problem where Manim, LaTeX, and other dependencies are not available.

## Benefits

- **Zero Local Dependencies**: No need to install Manim/LaTeX on production servers
- **Consistent Environment**: Same container image across all deployments
- **Auto-scaling**: Containers spin up on-demand
- **Cost Effective**: Only pay for actual compilation time
- **Fast**: Pre-built images with optimized dependencies

## Setup Instructions

### 1. Install Modal CLI

```bash
pip install modal
```

### 2. Create Modal Account

1. Go to [modal.com](https://modal.com) and create an account
2. Get your API tokens from [modal.com/settings/tokens](https://modal.com/settings/tokens)

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Modal credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```bash
# Modal Configuration
USE_MODAL_COMPILATION=true
MODAL_FALLBACK_TO_LOCAL=true
MODAL_TOKEN_ID=your_modal_token_id_here
MODAL_TOKEN_SECRET=your_modal_token_secret_here
```

### 4. Authenticate Modal CLI

```bash
modal token new
```

Follow the prompts to authenticate with your Modal account.

### 5. Deploy the Modal App

```bash
modal deploy modal_manim.py
```

This will:
- Build the container image with Manim dependencies
- Deploy the compilation function to Modal
- Provide you with the app URL and function endpoints

### 6. Test the Deployment

You can test the Modal app directly:

```bash
python modal_manim.py
```

Or test the API endpoint:

```bash
curl -X GET http://localhost:3000/api/manim-compile
```

This should return a health check showing Modal is available.

## Configuration Options

### Environment Variables

- `USE_MODAL_COMPILATION`: Set to `false` to use only local compilation
- `MODAL_FALLBACK_TO_LOCAL`: Set to `false` to disable fallback when Modal fails
- `MODAL_TOKEN_ID` & `MODAL_TOKEN_SECRET`: Your Modal API credentials

### Compilation Quality

The system supports three quality levels:
- `low_quality`: Fast rendering (480p, 15fps) - default
- `medium_quality`: Balanced (720p, 30fps)
- `high_quality`: Best quality (1080p, 60fps)

## Architecture

```
Frontend Request
    ↓
lib/manim-compiler.ts
    ↓
[Modal Available?] → YES → app/api/manim-compile → lib/modal-client.ts → Modal Container
    ↓                                                      ↓
   NO                                                 Compile & Return Video
    ↓                                                      ↓
Local Compilation                                    Save to /tmp/latest.mp4
                                                           ↓
                                                   Serve via /api/videos
```

## Troubleshooting

### Modal Authentication Issues

```bash
# Re-authenticate
modal token new

# Check if app is deployed
modal app list

# Check function logs
modal app logs classia-manim-compiler
```

### Compilation Failures

1. Check Modal app logs: `modal app logs classia-manim-compiler`
2. Test Modal health: `curl http://localhost:3000/api/manim-compile`
3. Verify environment variables in `.env`
4. Ensure fallback is enabled for development

### Local Fallback Not Working

1. Ensure `MODAL_FALLBACK_TO_LOCAL=true` in `.env`
2. Check that local Manim environment is set up (`manim-test/` directory)
3. Verify local compilation works independently

## Deployment to Production

### 1. Vercel Environment Variables

In your Vercel dashboard, add these environment variables:

```
USE_MODAL_COMPILATION=true
MODAL_FALLBACK_TO_LOCAL=false
MODAL_TOKEN_ID=your_token_id
MODAL_TOKEN_SECRET=your_token_secret
```

### 2. CI/CD Integration

Add Modal deployment to your CI/CD pipeline:

```yaml
# .github/workflows/deploy.yml
- name: Deploy Modal App
  env:
    MODAL_TOKEN_ID: ${{ secrets.MODAL_TOKEN_ID }}
    MODAL_TOKEN_SECRET: ${{ secrets.MODAL_TOKEN_SECRET }}
  run: |
    pip install modal
    modal deploy modal_manim.py
```

### 3. Monitoring

Monitor your Modal app usage at [modal.com/apps](https://modal.com/apps).

## Cost Optimization

- Use `low_quality` for development/testing
- Set appropriate timeouts to avoid runaway compilations
- Monitor usage in Modal dashboard
- Consider caching compiled videos if appropriate

## Development vs Production

### Development
- Enable fallback to local compilation
- Use `low_quality` for faster iteration
- Test both Modal and local compilation paths

### Production
- Disable fallback (Modal only)
- Use appropriate quality based on use case
- Set up monitoring and alerting
