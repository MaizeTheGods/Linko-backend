const bcrypt = require('bcrypt');

module.exports = {
    login: (req, res) => {
        const { email, password } = req.body;
        
        // Lógica para encontrar al usuario...
        
        bcrypt.compare(password, user.password)
            .then(doMatch => {
                if (doMatch) {
                    req.session.user = user;
                    return req.session.save(err => {
                        if (err) {
                            console.log(err);
                        }
                        res.status(200).json({ message: 'Login successful', user: user });
                    });
                }
                res.status(422).json({ message: 'Invalid email or password' });
            })
    }
}
