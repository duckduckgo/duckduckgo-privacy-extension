module.exports = `
.wrapper *, .wrapper *::before, .wrapper *::after {
    box-sizing: border-box;
}
.wrapper {
    position: fixed;
    top: 0;
    left: 0;
    padding: 0;
    font-family: 'DDG_ProximaNova', 'Proxima Nova', -apple-system,
    BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
    'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    z-index: 2147483647;
}
.tooltip {
    position: absolute;
    bottom: calc(100% + 15px);
    right: calc(100% - 60px);
    width: 350px;
    max-width: calc(100vw - 25px);
    padding: 25px;
    border: 1px solid #D0D0D0;
    border-radius: 20px;
    background-color: #FFFFFF;
    font-size: 14px;
    color: #333333;
    line-height: 1.4;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
    z-index: 2147483647;
}
.tooltip::before {
    content: "";
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    display: block;
    border-top: 12px solid #D0D0D0;
    position: absolute;
    right: 34px;
    bottom: -12px;
}
.tooltip::after {
    content: "";
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    display: block;
    border-top: 12px solid #FFFFFF;
    position: absolute;
    right: 34px;
    bottom: -10px;
}
.tooltip__title {
    margin: -4px 0 4px;
    font-size: 16px;
    font-weight: bold;
    line-height: 1.3;
}
.tooltip p {
    margin: 4px 0 12px;
}
.tooltip strong {
    font-weight: bold;
}
.tooltip__alias-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 10px auto 15px;
    font-size: 16px;
}
.alias {
    padding-left: 4px;
}
.tooltip__button-container {
    display: flex;
}
.tooltip__button {
    flex: 1;
    height: 40px;
    padding: 0 8px;
    background-color: #332FF3;
    color: #FFFFFF;
    font-family: inherit;
    font-size: 16px;
    font-weight: bold;
    border: none;
    border-radius: 10px;
}
.tooltip__button:last-child {
    margin-left: 12px;
}
.tooltip__button--secondary {
    background-color: #EEEEEE;
    color: #332FF3;
}
`
