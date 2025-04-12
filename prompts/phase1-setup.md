# Monday.com AI Workflow Assistant: Phase 1 - Setup

## Project Overview
I need to build a monday.com AI Workflow Assistant that integrates with the monday.com platform using their latest frameworks and AI capabilities. The application will analyze workflows, identify bottlenecks, suggest AI-powered optimizations, and automate workspace creation.

## Current Phase: Environment Setup

Please help me set up the development environment with these steps:

1. **Initialize GitHub Codespaces Environment**:
   - Make sure we have Node.js 18 or higher
   - Verify that Git is properly configured
   - Set up the project environment variables

2. **Install Required Dependencies**:
   ```bash
   # Install monday apps CLI globally
   npm install -g @mondaycom/apps-cli
   
   # Verify installation
   mapps help
   
   # Install dependencies from package.json
   npm install
   ```

3. **Configure monday.com SDK**:
   - Test the basic SDK connection
   - Verify that our API rate limiting is working properly
   - Make sure we can authenticate with monday.com

4. **Explore the Starter Code**:
   - Review the directory structure
   - Check the existing service files
   - Verify all required files are in place

5. **Test the Configuration**:
   - Create a simple test script to verify the monday.com connection
   - Check that our GraphQL client is properly configured
   - Verify that our Claude AI connection is working

Please implement these setup steps and show me the completed environment with screenshots or terminal output. Once complete, we'll move to the next phase to implement core functionality.

## Questions for Review
1. Is the rate limiting in the GraphQL client properly implemented to avoid throttling?
2. Are all the required dependencies installed and working properly?
3. Is there anything specific in the monday.com documentation that we should be aware of for this setup?