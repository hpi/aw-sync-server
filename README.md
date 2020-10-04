## watchers/aw-sync-server

### Install

`npm install`

### Usage

Deploy to somewhere that will be always running (like an offsite server!), you can use `provision` and `deploy` but make sure to change the IPs.

After deploying, make sure to have environment variable JWT_PUBLIC_KEY set to the public key content of the keypair you used to generate the JSON Web Token. You don't have to include the header (----BEGIN PUBLIC KEY---) or footer (----END PUBLIC KEY---). Check out https://gitlab.com/qnzl/auth/-/blob/master/checkJWT.js for more details.
