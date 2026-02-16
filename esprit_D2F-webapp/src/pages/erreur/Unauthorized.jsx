import { Navigate } from "react-router-dom"


function Unauthorized() {
  return (
    <div>
    <div className="color-line" />
    <div className="container-fluid">
      <div className="row">
        <div className="col-lg-12 col-md-12 col-sm-12 col-xs-12">
        <div className="back-link back-backend">
          <button onClick={() => Navigate(-1)} className="btn btn-primary">Retour</button>
        </div>
        </div>
      </div>
    </div>
    <div className="container-fluid">
      <div className="row">
        <div className="col-lg-3 col-md-3 col-sm-3 col-xs-12" />
        <div className="col-md-6 col-md-6 col-sm-6 col-xs-12">
          <div className="content-error">
            <h1>ERROR <span className="counter"> 404</span></h1>
            <p>Sorry, but the page you are looking for Unetaurized.</p>
            <a href="#">Report Problem</a>
          </div>
        </div>
        <div className="col-lg-3 col-md-3 col-sm-3 col-xs-12" />
      </div>
      <div className="row">
        <div className="col-md-12 col-md-12 col-sm-12 col-xs-12 text-center login-footer">
         
        </div>
      </div>
    </div>
  </div>
  )
}

export default Unauthorized