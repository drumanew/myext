function MyAuth (reporter) {

}

function configureRoutes (reporter, app, definition) {
  function inspectSession (session) {
    var request = require('sync-request')
    var res = request('GET',
                      'https://api.powervhc.com/v1/users/self',
                      { headers: { 'Cookie': 'session=' + session } })
    if (res.statusCode == 200) {
      try {
        return { authenticated: true, userdata: JSON.parse(res.getBody()) }
      } catch (err) {
        console.log(err)
        return { authenticated: false }
      }
    }

    return { authentication: false }
  }

  function checkAuth (req) {
    if (!req) {
      console.log('myext: req not defined')
      return { authenticated: false }
    }

    if (!req.cookies) {
      console.log('myext: cookies not defined')
      return { authentication: false }
    }

    if (!req.cookies.session) {
      console.log('myext: session cookie not defined')
      return { authentication: false }
    }

    return inspectSession(req.cookies.session)
  }

  app.get('/setcookie/*', function (req, res, next) {
    console.log('myext: Cookie requested')

    cookie = req.path.substring('/setcookie/'.length)

    if ((!req.cookies || !req.cookies.session)) {
      res.cookie('session', cookie, { maxAge: 900000, httpOnly: true })
      console.log('myext: set cookie ' + cookie + ' and redirect')

      return res.redirect('/')
    }

    return next()
  })

  app.use(function (req, res, next) {
    console.log('myext: Check Auth for incoming request: ' + req.method + ' ' + req.url)
    auth = checkAuth(req)
    req.myauth = auth

    if (auth.authenticated && auth.userdata) {
      req.context = {
        user: {
          _id: auth.userdata.systemClientId
        }
      }
    }
    return next()
  })

  app.use(function (req, res, next) {
    console.log('myext: Open or redirect?')

    if (req.myauth.authenticated) {
      console.log('myext: Open!')

      return next()
    } else {
      console.log('myext: Redirect to portal!')

      return res.redirect('https://portal.powervhc.com/')
    }
  })
}

module.exports = function (reporter, definition) {
  reporter.myauth = new MyAuth(reporter)
  reporter.authentication = true
  reporter.on('after-express-static-configure', function (app) {
    reporter.emit('before-myauth-express-routes', app)
    configureRoutes(reporter, app, definition)
    reporter.emit('after-myauth-express-routes', app)
  })

  console.log("myext: initialized")
}
