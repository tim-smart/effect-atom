/* @refresh reload */
import { render } from 'solid-js/web'
import { RegistryProvider } from '@effect-atom/atom-solid'
import App from './App'
import './index.css'

const root = document.getElementById('root')

render(() => (
  <RegistryProvider>
    <App />
  </RegistryProvider>
), root!)
